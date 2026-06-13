use serde::Serialize;
use std::path::{Path, PathBuf};
use std::time::Instant;
use walkdir::WalkDir;

#[derive(Debug, Serialize, Clone)]
pub struct SearchResult {
    pub title: String,
    pub path: String,
    pub snippet: String,
    pub score: f64,
    pub note_type: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SearchResponse {
    pub results: Vec<SearchResult>,
    pub elapsed_ms: u64,
    pub query: String,
    pub mode: String,
}

pub struct SearchOptions<'a> {
    pub vault_path: &'a str,
    pub query: &'a str,
    pub mode: &'a str,
    pub limit: usize,
    pub hide_gitignored_files: bool,
    pub exclude_frontmatter: bool,
}

struct Utf8Boundary<'a> {
    text: &'a str,
}

struct SnippetRequest<'a> {
    content: &'a str,
    query_lower: &'a str,
}

struct MatchScoreRequest<'a> {
    title_lower: &'a str,
    content_lower: &'a str,
    query_lower: &'a str,
    /// CJK bigrams of the query (empty if query has no CJK)
    query_bigrams: &'a [String],
}

impl Utf8Boundary<'_> {
    fn floor(&self, index: usize) -> usize {
        let mut boundary = index.min(self.text.len());
        while boundary > 0 && !self.text.is_char_boundary(boundary) {
            boundary -= 1;
        }
        boundary
    }

    fn lower_to_source(&self, lower_index: usize) -> usize {
        let mut lowered_len = 0;
        for (source_index, ch) in self.text.char_indices() {
            if lowered_len >= lower_index {
                return source_index;
            }
            lowered_len += ch.to_lowercase().map(|c| c.len_utf8()).sum::<usize>();
            if lowered_len > lower_index {
                return source_index;
            }
        }
        self.text.len()
    }
}

impl SnippetRequest<'_> {
    fn extract(&self) -> String {
        let content_lower = self.content.to_lowercase();
        let lower_pos = match content_lower.find(self.query_lower) {
            Some(p) => p,
            None => return String::new(),
        };
        let content_boundary = Utf8Boundary { text: self.content };
        let pos = content_boundary.lower_to_source(lower_pos);
        let start = self.content[..pos]
            .rfind('\n')
            .map(|i| i + 1)
            .unwrap_or_else(|| content_boundary.floor(pos.saturating_sub(60)));
        let end = self.content[pos..]
            .find('\n')
            .map(|i| pos + i)
            .unwrap_or_else(|| content_boundary.floor((pos + 120).min(self.content.len())));
        let snippet = &self.content[start..end];
        if snippet.len() > 200 {
            let end = Utf8Boundary { text: snippet }.floor(200);
            format!("{}…", &snippet[..end])
        } else {
            snippet.to_string()
        }
    }
}

/// Check if a string contains CJK (Chinese/Japanese/Korean) characters.
fn has_cjk(s: &str) -> bool {
    s.chars().any(|c| {
        let cat = c as u32;
        (cat >= 0x4E00 && cat <= 0x9FFF)   // CJK Unified Ideographs
        || (cat >= 0x3400 && cat <= 0x4DBF)  // CJK Extension A
        || (cat >= 0x2E80 && cat <= 0x2EFF)  // CJK Radicals
        || (cat >= 0x3000 && cat <= 0x303F)  // CJK Symbols and Punctuation
        || (cat >= 0xFF00 && cat <= 0xFFEF)  // Fullwidth forms
        || (cat >= 0x3040 && cat <= 0x309F)  // Hiragana
        || (cat >= 0x30A0 && cat <= 0x30FF)  // Katakana
        || (cat >= 0xAC00 && cat <= 0xD7AF)  // Hangul Syllables
    })
}

/// Extract overlapping CJK bigrams (2-char sequences) from text.
/// "北京大学" → ["北京", "京大", "大学"]
/// Returns empty vec if text has no CJK content.
fn extract_cjk_bigrams(s: &str) -> Vec<String> {
    let chars: Vec<char> = s.chars().collect();
    let mut bigrams = Vec::new();
    for i in 0..chars.len().saturating_sub(1) {
        // Only generate bigrams that contain at least one CJK character
        if is_cjk(chars[i]) || is_cjk(chars[i + 1]) {
            bigrams.push(format!("{}{}", chars[i], chars[i + 1]));
        }
    }
    bigrams
}

fn is_cjk(c: char) -> bool {
    let cat = c as u32;
    (cat >= 0x4E00 && cat <= 0x9FFF)
    || (cat >= 0x3400 && cat <= 0x4DBF)
    || (cat >= 0x2E80 && cat <= 0x2EFF)
    || (cat >= 0x3040 && cat <= 0x309F)
    || (cat >= 0x30A0 && cat <= 0x30FF)
    || (cat >= 0xAC00 && cat <= 0xD7AF)
}

/// Count how many bigrams from `query_bigrams` appear in `content_bigrams`.
fn cjk_bigram_overlap(query_bigrams: &[String], content_bigrams: &[String]) -> usize {
    query_bigrams.iter()
        .filter(|qb| content_bigrams.contains(qb))
        .count()
}

impl MatchScoreRequest<'_> {
    fn score(&self) -> f64 {
        let mut score = 0.0;

        // --- Standard (Latin/CJK exact) matching ---
        let title_exact = self.title_lower.contains(self.query_lower);
        let title_word = self
            .title_lower
            .split_whitespace()
            .any(|word| word == self.query_lower);
        let content_count = self.content_lower.matches(self.query_lower).count();

        if title_word {
            score += 10.0;
        } else if title_exact {
            score += 5.0;
        }
        score += (content_count as f64).min(20.0) * 0.5;

        // --- CJK bigram overlap scoring ---
        // When the query contains CJK characters, also score by bigram overlap.
        // This enables partial/fuzzy matching for Chinese text:
        //   e.g. "北京" matches "北京大学" (shared bigram: "北京")
        if !self.query_bigrams.is_empty() {
            let title_bigrams = extract_cjk_bigrams(self.title_lower);
            let content_bigrams = extract_cjk_bigrams(self.content_lower);

            let title_overlap = cjk_bigram_overlap(self.query_bigrams, &title_bigrams);
            let content_overlap = cjk_bigram_overlap(self.query_bigrams, &content_bigrams);

            if title_overlap > 0 {
                let ratio = title_overlap as f64 / self.query_bigrams.len() as f64;
                score += 8.0 * ratio;
            }
            if content_overlap > 0 {
                let ratio = content_overlap as f64 / self.query_bigrams.len() as f64;
                score += 3.0 * ratio;
            }

            // Boost files that match ALL query bigrams (perfect match)
            if content_overlap >= self.query_bigrams.len() {
                score += 5.0;
            }
        }

        score
    }
}

pub fn search_vault(
    vault_path: &str,
    query: &str,
    _mode: &str,
    limit: usize,
) -> Result<SearchResponse, String> {
    search_vault_with_options(SearchOptions {
        vault_path,
        query,
        mode: _mode,
        limit,
        hide_gitignored_files: crate::settings::hide_gitignored_files_enabled(),
        exclude_frontmatter: false,
    })
}

fn strip_frontmatter(content: &str) -> &str {
    let Some(rest) = content.strip_prefix("---") else {
        return content;
    };

    match rest.find("\n---") {
        Some(end) => rest[end + 4..].trim_start(),
        None => content,
    }
}

fn searchable_content(content: &str, exclude_frontmatter: bool) -> &str {
    if exclude_frontmatter {
        strip_frontmatter(content)
    } else {
        content
    }
}

fn is_markdown_search_candidate(vault_dir: &Path, path: &Path) -> bool {
    if !path.extension().is_some_and(|ext| ext == "md") {
        return false;
    }

    let vault_relative_path = path.strip_prefix(vault_dir).unwrap_or(path);
    !vault_relative_path
        .components()
        .any(|component| component.as_os_str().to_string_lossy().starts_with('.'))
}

fn collect_markdown_paths(vault_dir: &Path, hide_gitignored_files: bool) -> Vec<PathBuf> {
    let paths = WalkDir::new(vault_dir)
        .into_iter()
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.into_path())
        .filter(|path| is_markdown_search_candidate(vault_dir, path))
        .collect::<Vec<_>>();

    crate::vault::filter_gitignored_paths(vault_dir, paths, hide_gitignored_files)
}

pub fn search_vault_with_options(options: SearchOptions<'_>) -> Result<SearchResponse, String> {
    let start = Instant::now();
    let query_lower = options.query.to_lowercase();
    let vault_dir = Path::new(options.vault_path);

    // Pre-compute CJK bigrams if the query contains CJK characters
    let query_bigrams: Vec<String> = if has_cjk(&query_lower) {
        extract_cjk_bigrams(&query_lower)
    } else {
        Vec::new()
    };

    let mut results: Vec<SearchResult> = Vec::new();

    for path in collect_markdown_paths(vault_dir, options.hide_gitignored_files) {
        let content = match std::fs::read_to_string(&path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let searchable_content = searchable_content(&content, options.exclude_frontmatter);
        let content_lower = searchable_content.to_lowercase();
        let filename = path
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or("");
        let title = crate::vault::derive_markdown_title_from_content(&content, filename);
        let title_lower = title.to_lowercase();

        // Standard match check
        let standard_match = title_lower.contains(&query_lower) || content_lower.contains(&query_lower);

        // CJK bigram match check
        let bigram_match = if !query_bigrams.is_empty() {
            let title_bigrams = extract_cjk_bigrams(&title_lower);
            let content_bigrams = extract_cjk_bigrams(&content_lower);
            cjk_bigram_overlap(&query_bigrams, &title_bigrams) > 0
                || cjk_bigram_overlap(&query_bigrams, &content_bigrams) > 0
        } else {
            false
        };

        if !standard_match && !bigram_match {
            continue;
        }

        let score = MatchScoreRequest {
            title_lower: &title_lower,
            content_lower: &content_lower,
            query_lower: &query_lower,
            query_bigrams: &query_bigrams,
        }
        .score();

        // For bigram-only matches (no exact substring match), use a position-based snippet
        let snippet = if standard_match {
            SnippetRequest {
                content: searchable_content,
                query_lower: &query_lower,
            }
            .extract()
        } else {
            // For bigram matches, return the beginning of the content as snippet
            let snippet = &searchable_content[..searchable_content.len().min(200)];
            let end = Utf8Boundary { text: snippet }.floor(200.min(snippet.len()));
            format!("{}…", &snippet[..end])
        };

        let full_path = path.to_string_lossy().to_string();

        results.push(SearchResult {
            title,
            path: full_path,
            snippet,
            score,
            note_type: None,
        });
    }

    results.sort_by(|a, b| {
        b.score
            .partial_cmp(&a.score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    results.truncate(options.limit);

    let elapsed_ms = start.elapsed().as_millis() as u64;

    Ok(SearchResponse {
        results,
        elapsed_ms,
        query: options.query.to_string(),
        mode: options.mode.to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::Builder;

    fn init_git_repo(root: &Path) {
        crate::hidden_command("git")
            .args(["init"])
            .current_dir(root)
            .output()
            .unwrap();
    }

    macro_rules! snippet {
        ($content:expr, $query_lower:expr) => {
            SnippetRequest {
                content: $content,
                query_lower: $query_lower,
            }
            .extract()
        };
    }

    macro_rules! match_score {
        ($title_lower:expr, $content_lower:expr, $query_lower:expr) => {
            MatchScoreRequest {
                title_lower: $title_lower,
                content_lower: $content_lower,
                query_lower: $query_lower,
                query_bigrams: &[],
            }
            .score()
        };
    }

    #[test]
    fn test_extract_snippet_basic() {
        let content = "line one\nline with keyword here\nline three";
        let snippet = snippet!(content, "keyword");
        assert!(snippet.contains("keyword"));
    }

    #[test]
    fn test_extract_snippet_no_match() {
        let snippet = snippet!("nothing here", "missing");
        assert!(snippet.is_empty());
    }

    #[test]
    fn test_score_match_title_word() {
        let score = match_score!("my keyword", "", "keyword");
        assert!(score >= 10.0);
    }

    #[test]
    fn test_score_match_content_only() {
        let score = match_score!("unrelated", "some keyword text keyword", "keyword");
        assert!(score > 0.0);
        assert!(score < 10.0);
    }

    #[test]
    fn test_extract_snippet_long() {
        let long_line = "a".repeat(300);
        let content = format!("start\n{}keyword{}\nend", long_line, long_line);
        let snippet = snippet!(&content, "keyword");
        assert!(snippet.len() <= 203);
    }

    #[test]
    fn test_extract_snippet_multibyte_context_start() {
        let prefix = format!("{}a", "한".repeat(21));
        let content = format!("{prefix}needle after multibyte prefix");

        let snippet = snippet!(&content, "needle");

        assert!(snippet.contains("needle"));
        assert!(snippet.is_char_boundary(snippet.len()));
    }

    #[test]
    fn test_extract_snippet_multibyte_context_end() {
        let content = format!("x{}", "한".repeat(50));

        let snippet = snippet!(&content, "x");

        assert!(snippet.starts_with('x'));
        assert!(snippet.is_char_boundary(snippet.len()));
    }

    #[test]
    fn test_extract_snippet_multibyte_truncation() {
        let content = format!("key {}\n", "한".repeat(100));

        let snippet = snippet!(&content, "key");

        assert!(snippet.starts_with("key"));
        assert!(snippet.ends_with('…'));
        assert!(snippet.is_char_boundary(snippet.len()));
    }

    #[test]
    fn test_extract_snippet_maps_expanded_lowercase_to_source_boundary() {
        let content = "İstanbul needle";

        let snippet = snippet!(content, "i");

        assert!(snippet.starts_with("İstanbul"));
        assert!(snippet.is_char_boundary(snippet.len()));
    }

    #[test]
    fn test_has_cjk_detection() {
        assert!(has_cjk("你好世界"));
        assert!(has_cjk("hello 你好"));
        assert!(!has_cjk("hello world"));
        assert!(has_cjk("日本語テスト"));
        assert!(has_cjk("한글테스트"));
    }

    #[test]
    fn test_cjk_bigram_extraction() {
        let bigrams = extract_cjk_bigrams("北京大学");
        assert_eq!(bigrams, vec!["北京".to_string(), "京大".to_string(), "大学".to_string()]);
    }

    #[test]
    fn test_cjk_bigram_mixed_content() {
        let bigrams = extract_cjk_bigrams("hello北京world");
        assert!(bigrams.contains(&"北京".to_string()));
        assert_eq!(bigrams.len(), 1);
    }

    #[test]
    fn test_cjk_bigram_no_cjk() {
        let bigrams = extract_cjk_bigrams("hello world");
        assert!(bigrams.is_empty());
    }

    #[test]
    fn test_cjk_bigram_overlap_scoring() {
        let query = "北京";
        let title = "北京大学介绍";
        let content = "这是关于北京大学的内容。";

        let query_bigrams = extract_cjk_bigrams(query);
        let title_bigrams = extract_cjk_bigrams(title);
        let content_bigrams = extract_cjk_bigrams(content);

        let overlap = cjk_bigram_overlap(&query_bigrams, &title_bigrams);
        assert!(overlap > 0, "北京大学 should contain bigram 北京");

        let score = MatchScoreRequest {
            title_lower: title,
            content_lower: content,
            query_lower: query,
            query_bigrams: &query_bigrams,
        }.score();
        assert!(score > 0.0, "CJK bigram match should produce a positive score");
    }

    #[test]
    fn test_search_vault_uses_h1_for_result_title() {
        let dir = Builder::new()
            .prefix("search-vault-")
            .tempdir_in(std::env::current_dir().unwrap())
            .unwrap();
        let note_path = dir.path().join("legacy-name.md");
        fs::write(
            &note_path,
            "# Updated Display Title\n\nThe body contains keyword for search.",
        )
        .unwrap();

        let response =
            search_vault(dir.path().to_str().unwrap(), "keyword", "keyword", 10).unwrap();

        assert_eq!(response.results.len(), 1);
        assert_eq!(response.results[0].title, "Updated Display Title");
    }

    #[test]
    fn test_search_vault_hides_gitignored_notes_when_enabled() {
        let dir = Builder::new()
            .prefix("search-gitignored-")
            .tempdir_in(std::env::current_dir().unwrap())
            .unwrap();
        init_git_repo(dir.path());
        fs::create_dir_all(dir.path().join("ignored")).unwrap();
        fs::write(dir.path().join(".gitignore"), "ignored/\n").unwrap();
        fs::write(dir.path().join("visible.md"), "# Visible\n\nneedle").unwrap();
        fs::write(dir.path().join("ignored/hidden.md"), "# Hidden\n\nneedle").unwrap();

        let hidden = search_vault_with_options(SearchOptions {
            vault_path: dir.path().to_str().unwrap(),
            query: "needle",
            mode: "keyword",
            limit: 10,
            hide_gitignored_files: true,
            exclude_frontmatter: false,
        })
        .unwrap();
        let shown = search_vault_with_options(SearchOptions {
            vault_path: dir.path().to_str().unwrap(),
            query: "needle",
            mode: "keyword",
            limit: 10,
            hide_gitignored_files: false,
            exclude_frontmatter: false,
        })
        .unwrap();

        assert_eq!(hidden.results.len(), 1);
        assert_eq!(hidden.results[0].title, "Visible");
        assert_eq!(shown.results.len(), 2);
    }

    #[test]
    fn test_search_vault_can_exclude_frontmatter_from_content_matches() {
        let dir = Builder::new()
            .prefix("search-frontmatter-scope-")
            .tempdir_in(std::env::current_dir().unwrap())
            .unwrap();
        fs::write(
            dir.path().join("frontmatter-only.md"),
            [
                "---",
                "Owner: hidden-frontmatter-keyword",
                "---",
                "",
                "# Public Body",
                "",
                "The note body deliberately omits the hidden property token.",
            ]
            .join("\n"),
        )
        .unwrap();
        fs::write(
            dir.path().join("body-match.md"),
            "# Body Match\n\nBody includes hidden-frontmatter-keyword here.",
        )
        .unwrap();

        let response = search_vault_with_options(SearchOptions {
            vault_path: dir.path().to_str().unwrap(),
            query: "hidden-frontmatter-keyword",
            mode: "keyword",
            limit: 10,
            hide_gitignored_files: false,
            exclude_frontmatter: true,
        })
        .unwrap();

        assert_eq!(response.results.len(), 1);
        assert_eq!(response.results[0].title, "Body Match");
    }

    #[test]
    fn test_cjk_search_returns_chinese_results() {
        let dir = Builder::new()
            .prefix("cjk-search-")
            .tempdir_in(std::env::current_dir().unwrap())
            .unwrap();
        fs::write(
            dir.path().join("peking.md"),
            "# 北京大学\n\n北京大学位于北京海淀区。",
        )
        .unwrap();
        fs::write(
            dir.path().join("shanghai.md"),
            "# 上海大学\n\n上海大学位于上海市。",
        )
        .unwrap();

        let response =
            search_vault(dir.path().to_str().unwrap(), "北京", "keyword", 10).unwrap();

        assert_eq!(response.results.len(), 1);
        assert_eq!(response.results[0].title, "北京大学");
    }
}
