use base64::Engine as _;
use log::{error, info, warn};
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{Emitter, State};
use crate::settings;

/// WebDAV sync configuration stored in app settings.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct WebdavConfig {
    /// WebDAV server URL (e.g. `https://example.com/dav/`).
    pub url: String,
    /// Username for WebDAV authentication.
    pub username: String,
    /// Password for WebDAV authentication.
    pub password: String,
    /// Remote path prefix within the WebDAV server.
    pub remote_path: String,
    /// Whether automatic sync is enabled.
    pub enabled: bool,
    /// Unix timestamp of the last successful sync.
    pub last_sync_at: Option<u64>,
}

impl Default for WebdavConfig {
    fn default() -> Self {
        Self {
            url: String::new(),
            username: String::new(),
            password: String::new(),
            remote_path: "/mo-ti-vault".to_string(),
            enabled: false,
            last_sync_at: None,
        }
    }
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct SyncStatus {
    pub connected: bool,
    pub last_sync_at: Option<u64>,
    pub files_uploaded: usize,
    pub files_downloaded: usize,
    pub files_conflicted: usize,
    pub errors: Vec<String>,
}

/// Progress payload emitted during sync operations
#[derive(Debug, Clone, Serialize)]
pub struct ProgressPayload {
    pub current: usize,
    pub total: usize,
    pub phase: String,
}

/// Emit a progress event via Tauri's event channel
fn emit_progress(app_handle: &tauri::AppHandle, current: usize, total: usize, phase: &str) {
    let payload = ProgressPayload {
        current,
        total,
        phase: phase.to_string(),
    };
    if let Err(e) = app_handle.emit("webdav-sync-progress", payload) {
        warn!("[WebDAV] Failed to emit progress event: {e}");
    }
}

/// Sync vault with progress events emitted via Tauri AppHandle
pub fn sync_vault_with_progress(
    vault_path: &str,
    config: &WebdavConfig,
    app_handle: &tauri::AppHandle,
) -> Result<SyncStatus, String> {
    let vault_dir = Path::new(vault_path);
    if !vault_dir.exists() {
        return Err("知识库路径不存在".to_string());
    }

    let client = WebdavClient::new(config)?;
    let mut status = SyncStatus {
        connected: false,
        last_sync_at: Some(
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
        ),
        files_uploaded: 0,
        files_downloaded: 0,
        files_conflicted: 0,
        errors: Vec::new(),
    };

    // Test connection
    emit_progress(app_handle, 0, 0, "connecting");
    match client.test_connection() {
        Ok(_) => status.connected = true,
        Err(e) => {
            status.errors.push(e);
            return Ok(status);
        }
    }

    // Ensure remote directory exists
    emit_progress(app_handle, 0, 0, "ensuring-remote-dir");
    if let Err(e) = client.create_remote_dir("") {
        status.errors.push(format!("创建远程目录失败: {e}"));
        return Ok(status);
    }

    // Collect local files
    emit_progress(app_handle, 0, 0, "collecting");
    let local_files = match collect_vault_files(vault_dir) {
        Ok(f) => f,
        Err(e) => {
            status.errors.push(e);
            return Ok(status);
        }
    };

    // Collect remote files
    let remote_files = match client.list_files() {
        Ok(f) => f,
        Err(e) => {
            status.errors.push(e);
            return Ok(status);
        }
    };

    // Create a set of remote file paths for quick lookup
    let remote_paths: std::collections::HashSet<String> = remote_files.iter().cloned().collect();

    // Upload local files that don't exist remotely
    let total_uploads = local_files
        .iter()
        .filter(|local_path| {
            let rel = relative_path(vault_dir, local_path);
            let remote_path = format!("{}/{}", config.remote_path.trim_matches('/'), rel);
            !remote_paths.contains(&remote_path)
        })
        .count();
    let mut upload_current = 0usize;

    for local_path in &local_files {
        let rel = relative_path(vault_dir, local_path);
        let remote_path = format!("{}/{}", config.remote_path.trim_matches('/'), rel);

        if !remote_paths.contains(&remote_path) {
            upload_current += 1;
            emit_progress(
                app_handle,
                upload_current,
                total_uploads.max(1),
                "uploading",
            );
            match client.upload_file(local_path, &rel) {
                Ok(_) => status.files_uploaded += 1,
                Err(e) => status.errors.push(format!("上传 {} 失败: {e}", rel)),
            }
        }
    }

    // Download remote files that don't exist locally
    let remote_files_to_download: Vec<&String> = remote_files
        .iter()
        .filter(|remote_file| {
            let prefix = format!("/{}/", config.remote_path.trim_matches('/'));
            let rel = remote_file
                .trim_start_matches('/')
                .strip_prefix(&prefix.trim_start_matches('/'))
                .or_else(|| remote_file.strip_prefix(&prefix))
                .unwrap_or(remote_file.trim_start_matches('/'));
            if rel.is_empty() || rel.ends_with('/') {
                return false;
            }
            let local_path = vault_dir.join(rel);
            !local_path.exists()
        })
        .collect();
    let total_downloads = remote_files_to_download.len();
    let mut download_current = 0usize;

    for remote_file in &remote_files_to_download {
        // Extract relative path from the full WebDAV URL path
        let prefix = format!("/{}/", config.remote_path.trim_matches('/'));
        let rel = remote_file
            .trim_start_matches('/')
            .strip_prefix(&prefix.trim_start_matches('/'))
            .or_else(|| {
                // Try without leading slash
                remote_file.strip_prefix(&prefix)
            })
            .unwrap_or(remote_file.trim_start_matches('/'));

        if rel.is_empty() || rel.ends_with('/') {
            continue; // Skip directory entries
        }

        download_current += 1;
        emit_progress(
            app_handle,
            download_current,
            total_downloads.max(1),
            "downloading",
        );

        let local_path = vault_dir.join(rel);
        if !local_path.exists() {
            match client.download_file(rel, &local_path) {
                Ok(_) => status.files_downloaded += 1,
                Err(e) => status.errors.push(format!("下载 {} 失败: {e}", rel)),
            }
        }
    }

    // Done
    emit_progress(app_handle, 1, 1, "done");

    Ok(status)
}

pub struct WebdavClient {
    url: String,
    username: String,
    password: String,
    remote_path: String,
    client: reqwest::blocking::Client,
}

/// Retry a WebDAV HTTP request with exponential backoff.
///
/// Retry logic:
/// - Network errors (connection refused, timeout, DNS failure) → retry up to 3 times
/// - HTTP 429 (Too Many Requests), 502 (Bad Gateway), 503 (Service Unavailable),
///   504 (Gateway Timeout) → retry up to 3 times
/// - HTTP 401/403 (authentication failures) → NOT retried, returned immediately
/// - All other status codes → returned to the caller as-is
///
/// Backoff: 1s after first failure, 2s after second failure.
fn retry_webdav_request<F>(f: F) -> Result<reqwest::blocking::Response, String>
where
    F: Fn() -> Result<reqwest::blocking::Response, reqwest::Error>,
{
    let delays = [Duration::from_secs(1), Duration::from_secs(2)];
    let mut last_network_error: Option<String> = None;

    for attempt in 0..3 {
        match f() {
            Ok(resp) => {
                let status = resp.status().as_u16();
                if matches!(status, 429 | 502 | 503 | 504) {
                    if attempt < 2 {
                        warn!(
                            "[WebDAV] HTTP {status} (attempt {}/3), retrying in {}s...",
                            attempt + 1,
                            delays[attempt].as_secs()
                        );
                        std::thread::sleep(delays[attempt]);
                        continue;
                    }
                    return Err(format!("server returned HTTP {status} (retried 3 times)"));
                }
                return Ok(resp);
            }
            Err(e) => {
                let msg: String = format!("network error: {e}");
                last_network_error = Some(msg.clone());
                if attempt < 2 {
                    warn!(
                        "[WebDAV] {msg} (attempt {}/3), retrying in {}s...",
                        attempt + 1,
                        delays[attempt].as_secs()
                    );
                    std::thread::sleep(delays[attempt]);
                }
            }
        }
    }

    let msg: String = last_network_error.unwrap_or_else(|| "unknown network error".to_string());
    error!("[WebDAV] {msg} (retried 3 times)");
    Err(format!("{msg} (retried 3 times)"))
}

impl WebdavClient {
    pub fn new(config: &WebdavConfig) -> Result<Self, String> {
        let client = reqwest::blocking::Client::builder()
            .connect_timeout(Duration::from_secs(10))
            .timeout(Duration::from_secs(30))
            .danger_accept_invalid_certs(false)
            .build()
            .map_err(|e| format!("初始化 HTTP 客户端失败: {e}"))?;

        Self {
            url: config.url.trim_end_matches('/').to_string(),
            username: config.username.clone(),
            password: config.password.clone(),
            remote_path: config.remote_path.trim_matches('/').to_string(),
            client,
        }
    }

    fn auth_header(&self) -> String {
        let credentials = format!("{}:{}", self.username, self.password);
        format!("Basic {}", base64::engine::general_purpose::STANDARD.encode(credentials.as_bytes()))
    }

    fn remote_url(&self, path: &str) -> String {
        let path = path.trim_start_matches('/');
        format!("{}/{}/{}", self.url, self.remote_path, path)
    }

    /// Test connection to WebDAV server
    pub fn test_connection(&self) -> Result<String, String> {
        let url = format!("{}/{}", self.url, self.remote_path);
        let response = retry_webdav_request(|| {
            self.client
                .request("PROPFIND", &url)
                .header("Authorization", self.auth_header())
                .header("Depth", "0")
                .send()
        })?;

        if response.status().is_success() || response.status().as_u16() == 207 {
            info!("[WebDAV] 连接测试成功: {url}");
            Ok("连接成功".to_string())
        } else if response.status().as_u16() == 401 {
            Err("认证失败：用户名或密码错误".to_string())
        } else {
            Err(format!("服务器返回: {}", response.status()))
        }
    }

    /// List files in the remote directory (recursive for .md files)
    pub fn list_files(&self) -> Result<Vec<String>, String> {
        let url = self.remote_url("");
        let response = retry_webdav_request(|| {
            self.client
                .request("PROPFIND", &url)
                .header("Authorization", self.auth_header())
                .header("Depth", "1")
                .send()
        })?;

        if !response.status().is_success() && response.status().as_u16() != 207 {
            return Err(format!("列出文件失败: HTTP {}", response.status()));
        }

        let body = response.text().map_err(|e| format!("读取响应失败: {e}"))?;
        let paths = parse_propfind_response(&body);
        Ok(paths)
    }

    /// Download a file from WebDAV
    pub fn download_file(&self, remote_rel_path: &str, local_path: &Path) -> Result<(), String> {
        let url = self.remote_url(remote_rel_path);
        let response = retry_webdav_request(|| {
            self.client
                .get(&url)
                .header("Authorization", self.auth_header())
                .send()
        })?;

        if !response.status().is_success() {
            return Err(format!("下载失败: HTTP {}", response.status()));
        }

        let bytes = response.bytes().map_err(|e| format!("读取数据失败: {e}"))?;

        // Ensure parent directory exists
        if let Some(parent) = local_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("创建目录失败: {e}"))?;
        }

        std::fs::write(local_path, &bytes)
            .map_err(|e| format!("写入文件失败: {e}"))?;

        Ok(())
    }

    /// Upload a file to WebDAV
    pub fn upload_file(&self, local_path: &Path, remote_rel_path: &str) -> Result<(), String> {
        let content = std::fs::read_to_string(local_path)
            .map_err(|e| format!("读取文件失败: {e}"))?;

        let url = self.remote_url(remote_rel_path);
        let response = retry_webdav_request(|| {
            self.client
                .put(&url)
                .header("Authorization", self.auth_header())
                .body(content.clone())
                .send()
        })?;

        if !response.status().is_success() {
            return Err(format!("上传失败: HTTP {}", response.status()));
        }

        Ok(())
    }

    /// Create a remote directory (MKCOL)
    pub fn create_remote_dir(&self, dir_path: &str) -> Result<(), String> {
        let url = self.remote_url(dir_path);
        let response = retry_webdav_request(|| {
            self.client
                .request("MKCOL", &url)
                .header("Authorization", self.auth_header())
                .send()
        })?;

        // 405 = already exists, which is fine
        if response.status().is_success() || response.status().as_u16() == 405 {
            Ok(())
        } else {
            Err(format!("创建目录失败: HTTP {}", response.status()))
        }
    }
}

/// Parse a WebDAV PROPFIND XML response and extract file paths
fn parse_propfind_response(xml_body: &str) -> Vec<String> {
    let mut paths = Vec::new();
    // Simple XML parsing for href elements
    for line in xml_body.lines() {
        let trimmed = line.trim();
        if let Some(href) = trimmed.strip_prefix("<d:href>").or_else(|| trimmed.strip_prefix("<href>")) {
            if let Some(end) = href.find("</") {
                let path = &href[..end];
                // Skip the root directory itself
                if !path.ends_with('/') {
                    paths.push(path.to_string());
                }
            }
        }
    }
    paths
}

/// Collect all .md files in a vault directory (recursive)
fn collect_vault_files(vault_path: &Path) -> Result<Vec<PathBuf>, String> {
    let mut files = Vec::new();
    for entry in walkdir::WalkDir::new(vault_path)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        if path.extension().is_some_and(|ext| ext == "md") {
            files.push(path.to_path_buf());
        }
    }
    Ok(files)
}

/// Get the relative path of a file within the vault
fn relative_path(vault_path: &Path, file_path: &Path) -> String {
    file_path
        .strip_prefix(vault_path)
        .unwrap_or(file_path)
        .to_string_lossy()
        .to_string()
}

/// Two-way sync between a local vault and WebDAV remote
pub fn sync_vault(
    vault_path: &str,
    config: &WebdavConfig,
) -> Result<SyncStatus, String> {
    let vault_dir = Path::new(vault_path);
    if !vault_dir.exists() {
        return Err("知识库路径不存在".to_string());
    }

    let client = WebdavClient::new(config)?;
    let mut status = SyncStatus {
        connected: false,
        last_sync_at: Some(
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
        ),
        files_uploaded: 0,
        files_downloaded: 0,
        files_conflicted: 0,
        errors: Vec::new(),
    };

    // Test connection
    match client.test_connection() {
        Ok(_) => status.connected = true,
        Err(e) => {
            status.errors.push(e);
            return Ok(status);
        }
    }

    // Ensure remote directory exists
    if let Err(e) = client.create_remote_dir("") {
        status.errors.push(format!("创建远程目录失败: {e}"));
        return Ok(status);
    }

    // Collect local files
    let local_files = match collect_vault_files(vault_dir) {
        Ok(f) => f,
        Err(e) => {
            status.errors.push(e);
            return Ok(status);
        }
    };

    // Collect remote files
    let remote_files = match client.list_files() {
        Ok(f) => f,
        Err(e) => {
            status.errors.push(e);
            return Ok(status);
        }
    };

    // Create a set of remote file paths for quick lookup
    let remote_paths: std::collections::HashSet<String> = remote_files.iter().cloned().collect();

    // Upload local files that don't exist remotely
    for local_path in &local_files {
        let rel = relative_path(vault_dir, local_path);
        let remote_path = format!("{}/{}", config.remote_path.trim_matches('/'), rel);

        if !remote_paths.contains(&remote_path) {
            match client.upload_file(local_path, &rel) {
                Ok(_) => status.files_uploaded += 1,
                Err(e) => status.errors.push(format!("上传 {} 失败: {e}", rel)),
            }
        }
    }

    // Download remote files that don't exist locally
    for remote_file in &remote_files {
        // Extract relative path from the full WebDAV URL path
        let prefix = format!("/{}/", config.remote_path.trim_matches('/'));
        let rel = remote_file
            .trim_start_matches('/')
            .strip_prefix(&prefix.trim_start_matches('/'))
            .or_else(|| {
                // Try without leading slash
                remote_file
                    .strip_prefix(&prefix)
            })
            .unwrap_or(remote_file.trim_start_matches('/'));

        if rel.is_empty() || rel.ends_with('/') {
            continue; // Skip directory entries
        }

        let local_path = vault_dir.join(rel);
        if !local_path.exists() {
            match client.download_file(rel, &local_path) {
                Ok(_) => status.files_downloaded += 1,
                Err(e) => status.errors.push(format!("下载 {} 失败: {e}", rel)),
            }
        }
    }

    Ok(status)
}

// ===== Tauri Commands =====

#[tauri::command]
pub fn test_webdav_connection(
    url: String,
    username: String,
    password: String,
    remote_path: String,
) -> Result<String, String> {
    let config = WebdavConfig {
        url,
        username,
        password,
        remote_path,
        enabled: true,
        last_sync_at: None,
    };
    let client = WebdavClient::new(&config)?;
    client.test_connection()
}

#[tauri::command]
pub fn sync_webdav(
    vault_path: String,
    url: String,
    username: String,
    password: String,
    remote_path: String,
) -> Result<SyncStatus, String> {
    let config = WebdavConfig {
        url,
        username,
        password,
        remote_path,
        enabled: true,
        last_sync_at: None,
    };
    sync_vault(&vault_path, &config)
}

/// Same as sync_webdav but emits progress events via Tauri event channel
#[tauri::command]
pub fn sync_webdav_with_progress(
    app_handle: tauri::AppHandle,
    vault_path: String,
    url: String,
    username: String,
    password: String,
    remote_path: String,
) -> Result<SyncStatus, String> {
    let config = WebdavConfig {
        url,
        username,
        password,
        remote_path,
        enabled: true,
        last_sync_at: None,
    };
    sync_vault_with_progress(&vault_path, &config, &app_handle)
}
