/**
 * Vault operations — read-only helpers for Tolaria markdown vault.
 * Most write operations are handled by the app-managed agent's active
 * permission profile and native file-edit tools; createNote is intentionally
 * narrow so read-only agents can create a new Markdown file without overwrite.
 *
 * Search enhancements:
 *   - CJK bigram matching (aligns with src-tauri/src/search.rs)
 *   - Pinyin fuzzy search (via pinyin-pro for Node.js)
 *   - Scored results sorted by relevance
 */
import { mkdir, open, opendir, realpath } from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import { pinyin as pinyinPro } from 'pinyin-pro'

const ACTIVE_VAULT_ERROR = 'Note path must stay inside the active vault'

// ─── CJK / Pinyin search helpers (aligned with src-tauri/src/search.rs) ────

/**
 * Check if a character is CJK (Chinese/Japanese/Korean).
 * Matches the ranges from search.rs is_cjk().
 * @param {string} c - A single character
 * @returns {boolean}
 */
function isCJK(c) {
  const cat = c.charCodeAt(0)
  return (cat >= 0x4E00 && cat <= 0x9FFF)      // CJK Unified Ideographs
    || (cat >= 0x3400 && cat <= 0x4DBF)         // CJK Extension A
    || (cat >= 0x2E80 && cat <= 0x2EFF)         // CJK Radicals
    || (cat >= 0x3040 && cat <= 0x309F)         // Hiragana
    || (cat >= 0x30A0 && cat <= 0x30FF)         // Katakana
    || (cat >= 0xAC00 && cat <= 0xD7AF)         // Hangul Syllables
}

/**
 * Check if a string contains CJK characters.
 * @param {string} text
 * @returns {boolean}
 */
function hasCJK(text) {
  for (const c of text) {
    if (isCJK(c)) return true
  }
  return false
}

/**
 * Check if a string contains Latin (ASCII alphabetic) characters.
 * @param {string} text
 * @returns {boolean}
 */
function hasLatin(text) {
  for (const c of text) {
    if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')) return true
  }
  return false
}

/**
 * Extract overlapping CJK bigrams from text.
 * "北京大学" → ["北京", "京大", "大学"]
 * Only generates bigrams that contain at least one CJK character.
 * @param {string} text
 * @returns {string[]}
 */
function extractCJKBigrams(text) {
  const chars = [...text]
  const bigrams = []
  for (let i = 0; i < chars.length - 1; i++) {
    if (isCJK(chars[i]) || isCJK(chars[i + 1])) {
      bigrams.push(chars[i] + chars[i + 1])
    }
  }
  return bigrams
}

/**
 * Count how many query bigrams appear in content bigrams.
 * @param {string[]} queryBigrams
 * @param {string[]} contentBigrams
 * @returns {number}
 */
function cjkBigramOverlap(queryBigrams, contentBigrams) {
  const contentSet = new Set(contentBigrams)
  return queryBigrams.filter(qb => contentSet.has(qb)).length
}

/**
 * Convert Chinese characters in text to pinyin (without tones).
 * Uses pinyin-pro for Node.js (equivalent to Rust's pinyin crate).
 * Non-CJK characters are preserved and lowercased.
 * Example: "北京大学" → "beijingdaxue"
 * @param {string} text
 * @returns {string}
 */
function textToPinyin(text) {
  // Early exit: no CJK → just lowercase
  if (!hasCJK(text)) return text.toLowerCase()

  // Use pinyin-pro with toneType 'none' (no tone marks)
  const spaced = pinyinPro(text, { toneType: 'none' })
  // pinyin-pro returns space-separated syllables: "bei jing da xue"
  // Remove spaces and lowercase for matching
  return spaced.replace(/\s+/g, '').toLowerCase()
}

/**
 * Convert text to pinyin and return both the pinyin string and a mapping
 * from pinyin character positions to original character positions.
 * Each mapping entry is (origIdx, pinyinStart, pinyinLen).
 * @param {string} text
 * @returns {{ pinyin: string, map: Array<{origIdx: number, pinyinStart: number, pinyinLen: number}> }}
 */
function textToPinyinWithMap(text) {
  if (!hasCJK(text)) {
    const lower = text.toLowerCase()
    return { pinyin: lower, map: [] }
  }

  const chars = [...text]
  const segments = chars.map(c => {
    if (isCJK(c)) {
      const p = pinyinPro(c, { toneType: 'none' })
      return p.replace(/\s+/g, '')
    }
    return c.toLowerCase()
  })

  const pinyin = segments.join('')
  const map = []
  let pinyinPos = 0
  for (let i = 0; i < chars.length; i++) {
    const segLen = segments[i].length
    map.push({ origIdx: i, pinyinStart: pinyinPos, pinyinLen: segLen })
    pinyinPos += segLen
  }

  return { pinyin, map }
}

// ─── End of CJK / Pinyin helpers ──────────────────────────────────────────

/**
 * Recursively find all .md files under a directory.
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
export async function findMarkdownFiles(dir) {
  const results = []
  const items = await opendir(dir)
  for await (const item of items) {
    await collectMarkdownFile(results, dir, item)
  }
  return results
}

async function resolveVaultNotePath(vaultPath, notePath) {
  const vaultRoot = await realpath(vaultPath)
  const requestedPath = resolveRequestedNotePath(vaultRoot, notePath)
  const noteRealPath = await realpath(requestedPath)
  const relativePath = path.relative(vaultRoot, noteRealPath)

  if (!isVaultRelativePath(relativePath)) {
    throw new Error(ACTIVE_VAULT_ERROR)
  }

  return {
    vaultRoot,
    noteRealPath,
    relativePath,
  }
}

/**
 * Read a note with parsed frontmatter and content.
 * @param {string} vaultPath
 * @param {string} notePath
 * @returns {Promise<{path: string, frontmatter: Record<string, unknown>, content: string}>}
 */
export async function getNote(vaultPath, notePath) {
  const {
    noteRealPath,
    relativePath,
  } = await resolveVaultNotePath(vaultPath, notePath)
  const raw = await readUtf8File(noteRealPath)
  const parsed = parseMarkdownNote(raw)
  return {
    path: relativePath,
    frontmatter: parsed.data,
    content: parsed.content.trim(),
  }
}

/**
 * Create a new markdown note inside the vault without overwriting an existing file.
 * @param {string} vaultPath
 * @param {string} notePath
 * @param {string} content
 * @returns {Promise<{path: string, absolutePath: string}>}
 */
export async function createNote(vaultPath, notePath, content) {
  const { requestedPath, relativePath } = await resolveNewVaultNotePath(vaultPath, notePath)
  await writeNewUtf8File(requestedPath, content)
  return {
    path: relativePath,
    absolutePath: requestedPath,
  }
}

/**
 * Search notes by title or content with scored relevance.
 * Supports:
 *   - Standard substring matching (exact + title word boost)
 *   - CJK bigram fuzzy matching (e.g. "大学" matches "北京大学")
 *   - Pinyin fuzzy matching (e.g. "beijing" matches "北京")
 *   - Single CJK character matching (e.g. "京" matches any note containing 京)
 *
 * Results are sorted by score descending (max 10 for title word match).
 *
 * @param {string} vaultPath
 * @param {string} query
 * @param {number} [limit=10]
 * @returns {Promise<Array<{path: string, title: string, snippet: string, score: number}>>}
 */
export async function searchNotes(vaultPath, query, limit = 10) {
  const files = await findMarkdownFiles(vaultPath)
  const queryLower = query.toLowerCase()
  const results = []

  // Pre-compute CJK bigrams if the query contains CJK characters
  const queryBigrams = hasCJK(queryLower) ? extractCJKBigrams(queryLower) : []

  // Single-character CJK fallback
  const queryCjkChars = [...queryLower].filter(c => isCJK(c))
  const queryHasSingleCjk = queryCjkChars.length === 1

  // Pinyin search flag: query has Latin letters → potential pinyin match
  const queryHasLatin = hasLatin(queryLower)

  for (const filePath of files) {
    if (results.length >= limit && results.every(r => r.score > 0)) break

    const content = await readUtf8File(filePath)
    const filename = path.basename(filePath, '.md')
    const title = extractTitle(content, filename)
    const titleLower = title.toLowerCase()
    const contentLower = content.toLowerCase()

    // Pre-compute pinyin versions when query has Latin letters
    let titlePinyin = ''
    let contentPinyin = ''
    if (queryHasLatin) {
      titlePinyin = textToPinyin(titleLower)
      contentPinyin = textToPinyin(content)
    }

    // Standard match check
    const standardMatch = titleLower.includes(queryLower) || contentLower.includes(queryLower)

    // CJK bigram match check
    let bigramMatch = false
    let titleBigrams = []
    let contentBigrams = []
    if (queryBigrams.length > 0) {
      titleBigrams = extractCJKBigrams(titleLower)
      contentBigrams = extractCJKBigrams(contentLower)
      bigramMatch = cjkBigramOverlap(queryBigrams, titleBigrams) > 0
        || cjkBigramOverlap(queryBigrams, contentBigrams) > 0
    }

    // Single CJK character fallback
    const singleCjkMatch = queryHasSingleCjk
      ? (titleLower.includes(queryCjkChars[0]) || contentLower.includes(queryCjkChars[0]))
      : false

    // Pinyin fuzzy match
    const pinyinMatch = queryHasLatin
      ? (titlePinyin !== '' && titlePinyin.includes(queryLower))
        || (contentPinyin !== '' && contentPinyin.includes(queryLower))
      : false

    if (!standardMatch && !bigramMatch && !singleCjkMatch && !pinyinMatch) {
      continue
    }

    // Compute score
    let score = 0

    // --- Standard (Latin/CJK exact) matching ---
    const titleExact = titleLower.includes(queryLower)
    const titleWord = titleLower.split(/\s+/).some(word => word === queryLower)
    const contentCount = contentLower.split(queryLower).length - 1

    if (titleWord) {
      score += 10.0
    } else if (titleExact) {
      score += 5.0
    }
    score += Math.min(contentCount, 40) * 0.5

    // --- CJK bigram overlap scoring ---
    if (queryBigrams.length > 0) {
      const titleOverlap = cjkBigramOverlap(queryBigrams, titleBigrams)
      const contentOverlap = cjkBigramOverlap(queryBigrams, contentBigrams)

      if (titleOverlap > 0) {
        const ratio = titleOverlap / queryBigrams.length
        score += 8.0 * ratio
      }
      if (contentOverlap > 0) {
        const ratio = contentOverlap / queryBigrams.length
        score += 3.0 * ratio
      }

      // Boost files that match ALL query bigrams
      if (contentOverlap >= queryBigrams.length) {
        score += 5.0
      }
    }

    // --- Pinyin fuzzy matching ---
    if (queryHasLatin) {
      if (titlePinyin !== '' && titlePinyin.includes(queryLower)) {
        score += 4.0
      }
      if (contentPinyin !== '' && contentPinyin.includes(queryLower)) {
        score += 2.0
      }
    }

    // Build snippet
    const snippet = buildSearchSnippet(content, queryLower, standardMatch, pinyinMatch)

    results.push({
      path: path.relative(vaultPath, filePath),
      title,
      snippet,
      score,
    })
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score)
  return results.slice(0, limit)
}

/**
 * Build a search snippet around the match.
 * For standard matches, extracts text around the query position.
 * For bigram/pinyin-only matches, returns the beginning of content.
 * For pinyin matches, applies pinyin-based highlighting.
 */
function buildSearchSnippet(content, queryLower, standardMatch, pinyinMatch) {
  const body = content.replace(/^---[\s\S]*?---\n?/, '').trim()

  if (!standardMatch) {
    // For non-standard matches (bigram/pinyin), return the beginning
    return body.slice(0, 200) + (body.length > 200 ? '...' : '')
  }

  const idx = body.toLowerCase().indexOf(queryLower)
  if (idx === -1) return body.slice(0, 120)

  const start = Math.max(0, idx - 40)
  const end = Math.min(body.length, idx + queryLower.length + 80)
  let snippet = (start > 0 ? '...' : '') + body.slice(start, end) + (end < body.length ? '...' : '')

  if (pinyinMatch) {
    snippet = applyPinyinHighlight(snippet, queryLower)
  }

  return snippet
}

/**
 * Apply [[HIGHLIGHT]]/[[END_HIGHLIGHT]] markers to a snippet for pinyin matches.
 * Maps pinyin match positions back to original Chinese character positions.
 */
function applyPinyinHighlight(snippet, queryLower) {
  if (!snippet || !queryLower) return snippet

  const { pinyin: snippetPinyin, map } = textToPinyinWithMap(snippet)

  // Find all positions where queryLower is found in the pinyin representation
  const ranges = []
  let searchPos = 0
  while (searchPos < snippetPinyin.length) {
    const pos = snippetPinyin.indexOf(queryLower, searchPos)
    if (pos === -1) break

    const pinyinEnd = pos + queryLower.length

    // Map pinyin range to original snippet character range
    const chars = [...snippet]
    let origStart = -1
    let origEnd = -1

    for (const entry of map) {
      const pStart = entry.pinyinStart
      const pEnd = entry.pinyinStart + entry.pinyinLen
      const cStart = entry.origIdx
      const cEnd = entry.origIdx + 1 // each CJK char is one JS char

      // Check overlap with query range in pinyin
      if (pStart <= pos && pos < pEnd) {
        // Find byte start in snippet
        let bytePos = 0
        for (let j = 0; j < cStart; j++) {
          bytePos += chars[j].length
        }
        if (origStart === -1) origStart = bytePos
      }
      if (pStart < pinyinEnd && pinyinEnd > pStart) {
        let bytePos = 0
        for (let j = 0; j < cEnd; j++) {
          bytePos += chars[j].length
        }
        if (bytePos > origEnd) origEnd = bytePos
      }
    }

    if (origStart >= 0 && origEnd > origStart) {
      ranges.push([origStart, origEnd])
    }

    searchPos = pos + 1
  }

  if (ranges.length === 0) return snippet

  // Sort and merge overlapping ranges
  ranges.sort((a, b) => a[0] - b[0])
  const merged = []
  for (const [s, e] of ranges) {
    if (merged.length > 0 && s <= merged[merged.length - 1][1]) {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], e)
    } else {
      merged.push([s, e])
    }
  }

  // Build highlighted snippet
  let result = ''
  let lastEnd = 0
  for (const [s, e] of merged) {
    result += snippet.slice(lastEnd, s)
    result += '[[HIGHLIGHT]]'
    result += snippet.slice(s, e)
    result += '[[END_HIGHLIGHT]]'
    lastEnd = e
  }
  result += snippet.slice(lastEnd)
  return result
}

/**
 * Get vault context: unique types, note count, top-level folders, and 20 most recent notes.
 * @param {string} vaultPath
 * @returns {Promise<{types: string[], noteCount: number, folders: string[], recentNotes: Array<{path: string, title: string, type: string|null}>, vaultPath: string}>}
 */
export async function vaultContext(vaultPath) {
  const files = await findMarkdownFiles(vaultPath)
  const typesSet = new Set()
  const foldersSet = new Set()
  const notesWithMtime = []

  for (const filePath of files) {
    const { topFolder, note, type } = await readVaultContextNote(vaultPath, filePath)
    if (type) typesSet.add(type)
    if (topFolder) foldersSet.add(topFolder)
    notesWithMtime.push(note)
  }

  notesWithMtime.sort((a, b) => b.mtime - a.mtime)
  const recentNotes = notesWithMtime.slice(0, 20).map(contextNoteWithoutMtime)

  return {
    types: [...typesSet].sort(),
    noteCount: files.length,
    folders: [...foldersSet].sort(),
    recentNotes,
    configFiles: await readConfigFiles(vaultPath),
    vaultPath,
  }
}

// --- Helpers ---

async function collectMarkdownFile(results, dir, item) {
  if (item.name.startsWith('.')) return

  const full = resolveInside(dir, item.name)
  if (!full) return
  if (item.isDirectory()) {
    results.push(...await findMarkdownFiles(full))
    return
  }

  if (item.name.endsWith('.md')) {
    results.push(full)
  }
}

function resolveRequestedNotePath(vaultRoot, notePath) {
  if (path.isAbsolute(notePath)) return notePath
  const resolved = resolveInside(vaultRoot, notePath)
  if (!resolved) throw new Error(ACTIVE_VAULT_ERROR)
  return resolved
}

async function resolveNewVaultNotePath(vaultPath, notePath) {
  const requestedNotePath = validateNewNotePath(notePath)
  const vaultRoot = await realpath(vaultPath)
  const requestedPath = resolveRequestedNotePath(vaultRoot, requestedNotePath)
  const relativePath = relativeNotePathInsideVault(vaultRoot, requestedPath)
  await ensureWritableParentInsideVault(vaultRoot, requestedPath)
  return { requestedPath, relativePath }
}

function validateNewNotePath(notePath) {
  const trimmedPath = typeof notePath === 'string' ? notePath.trim() : ''
  if (!trimmedPath) {
    throw new Error('Note path is required')
  }
  if (!trimmedPath.endsWith('.md')) {
    throw new Error('New notes must be markdown files ending in .md')
  }
  return trimmedPath
}

async function ensureWritableParentInsideVault(vaultRoot, requestedPath) {
  const parentPath = path.dirname(requestedPath)
  const existingAncestor = await nearestExistingAncestor(parentPath)
  assertInsideVault(vaultRoot, existingAncestor)
  await mkdir(parentPath, { recursive: true })
  assertInsideVault(vaultRoot, await realpath(parentPath))
}

async function nearestExistingAncestor(targetPath) {
  let currentPath = targetPath
  while (currentPath && currentPath !== path.dirname(currentPath)) {
    try {
      return await realpath(currentPath)
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
      currentPath = path.dirname(currentPath)
    }
  }
  return realpath(currentPath)
}

function assertInsideVault(vaultRoot, targetPath) {
  if (!isVaultRelativePath(path.relative(vaultRoot, targetPath))) {
    throw new Error(ACTIVE_VAULT_ERROR)
  }
}

function relativeNotePathInsideVault(vaultRoot, requestedPath) {
  const relativePath = path.relative(vaultRoot, requestedPath)
  if (!isVaultRelativePath(relativePath) || !relativePath) {
    throw new Error(ACTIVE_VAULT_ERROR)
  }
  return relativePath
}

function resolveInside(root, target) {
  const resolved = path.resolve(root, target)
  const relative = path.relative(root, resolved)
  if (isVaultRelativePath(relative)) return resolved
  return null
}

function isVaultRelativePath(relativePath) {
  return !relativePath.startsWith('..') && !path.isAbsolute(relativePath)
}

function contextNoteWithoutMtime(note) {
  return {
    path: note.path,
    title: note.title,
    type: note.type,
  }
}

async function readVaultContextNote(vaultPath, filePath) {
  const raw = await readUtf8File(filePath)
  const parsed = parseMarkdownNote(raw)
  const rel = path.relative(vaultPath, filePath)
  const topFolder = extractTopFolder(rel)
  const stat = await statFile(filePath)
  const type = parsed.data.type || parsed.data.is_a || null

  return {
    topFolder,
    type,
    note: {
      path: rel,
      title: parsed.data.title || extractTitle(raw, path.basename(filePath, '.md')),
      type,
      mtime: stat.mtimeMs,
    },
  }
}

function parseMarkdownNote(raw) {
  try {
    const parsed = matter(raw)
    const fallback = parseFrontmatterFallback(raw)
    return shouldUseFallbackFrontmatter(parsed, fallback) ? fallback : parsed
  } catch {
    return parseFrontmatterFallback(raw)
  }
}

function shouldUseFallbackFrontmatter(parsed, fallback) {
  return Object.keys(parsed.data).length === 0 && Object.keys(fallback.data).length > 0
}

function parseFrontmatterFallback(raw) {
  const split = splitFrontmatter(raw)
  if (!split) return { data: {}, content: raw }

  return {
    data: parseFrontmatterBlock(split.frontmatter),
    content: split.content,
  }
}

function splitFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)([\s\S]*)$/)
  if (!match) return null
  return { frontmatter: match[1], content: match[2] }
}

function parseFrontmatterBlock(frontmatter) {
  const data = {}
  let listKey = null

  for (const line of frontmatter.split(/\r?\n/)) {
    const item = parseYamlListItem(line)
    if (listKey && item !== null) {
      data[listKey].push(parseYamlScalar(item))
      continue
    }

    listKey = null
    const field = parseTopLevelYamlField(line)
    if (!field) continue

    data[field.key] = field.value ? parseYamlValue(field.value) : []
    listKey = field.value ? null : field.key
  }

  return data
}

function parseTopLevelYamlField(line) {
  if (!line || line.trimStart() !== line || line.trimStart().startsWith('#')) return null

  const separatorIndex = line.indexOf(':')
  if (separatorIndex <= 0) return null

  return {
    key: stripMatchingQuotes(line.slice(0, separatorIndex).trim()),
    value: line.slice(separatorIndex + 1).trim(),
  }
}

function parseYamlValue(value) {
  if (value.startsWith('[') && value.endsWith(']')) {
    return splitInlineYamlArray(value).map(parseYamlScalar)
  }
  return parseYamlScalar(value)
}

function splitInlineYamlArray(value) {
  const inner = value.slice(1, -1)
  const items = []
  let current = ''
  let quote = null

  for (const char of inner) {
    if (quote) {
      current += char
      if (char === quote) quote = null
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      current += char
      continue
    }
    if (char === ',') {
      items.push(current.trim())
      current = ''
      continue
    }
    current += char
  }

  if (current.trim()) items.push(current.trim())
  return items
}

function parseYamlListItem(line) {
  const match = line.match(/^\s+-\s*(.*)$/)
  return match ? match[1].trim() : null
}

function parseYamlScalar(value) {
  const unquoted = stripMatchingQuotes(value.trim())
  if (unquoted !== value.trim()) return unquoted

  if (/^(true|yes)$/i.test(unquoted)) return true
  if (/^(false|no)$/i.test(unquoted)) return false
  if (/^(null|~)$/i.test(unquoted)) return null
  if (/^-?\d+(\.\d+)?$/.test(unquoted)) return Number(unquoted)

  return unquoted
}

function stripMatchingQuotes(value) {
  const first = value[0]
  const last = value[value.length - 1]
  return (first === '"' || first === "'") && first === last ? value.slice(1, -1) : value
}

function extractTopFolder(relativePath) {
  const topFolder = relativePath.split(path.sep)[0]
  return topFolder === relativePath ? null : `${topFolder}/`
}

async function readConfigFiles(vaultPath) {
  const configFiles = {}

  try {
    const agentsPath = resolveInside(vaultPath, 'config/agents.md')
    if (agentsPath) configFiles.agents = await readUtf8File(agentsPath)
  } catch {
    // config/agents.md may not exist yet
  }

  return configFiles
}

async function readUtf8File(filePath) {
  const handle = await open(filePath, 'r')
  try {
    return await handle.readFile('utf-8')
  } finally {
    await handle.close()
  }
}

async function writeNewUtf8File(filePath, content) {
  const handle = await open(filePath, 'wx')
  try {
    await handle.writeFile(content, 'utf-8')
  } finally {
    await handle.close()
  }
}

async function statFile(filePath) {
  const handle = await open(filePath, 'r')
  try {
    return await handle.stat()
  } finally {
    await handle.close()
  }
}

/**
 * Extract title from markdown content (first H1 or frontmatter title).
 * @param {string} content
 * @param {string} fallback
 * @returns {string}
 */
function extractTitle(content, fallback) {
  const h1Match = content.match(/^#\s+(.+)$/m)
  if (h1Match) return h1Match[1].trim()

  const titleMatch = content.match(/^title:\s*(.+)$/m)
  if (titleMatch) return titleMatch[1].trim()

  return fallback
}
