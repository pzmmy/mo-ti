use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use base64::Engine as _;
use rand::RngCore;
use sha2::{Digest, Sha256};
use std::fs;
use std::path::PathBuf;

const SECRETS_DIR: &str = "com.tolaria.app";
const SECRETS_FILE: &str = "webdav-passwords.enc";
const SALT: &[u8] = b"tolaria-webdav-v1-salt-2024";

/// Derive a 256-bit AES key from a machine identifier + fixed salt.
fn derive_encryption_key() -> Result<[u8; 32], String> {
    // Use hostname as machine identifier (available on all platforms)
    let hostname = hostname::get()
        .map_err(|e| format!("Failed to get hostname: {e}"))?
        .to_string_lossy()
        .to_string();

    // Also include the config directory path to make the key app-specific
    let config_dir = dirs::config_dir()
        .ok_or_else(|| "Could not determine config directory".to_string())?
        .join(SECRETS_DIR);

    let machine_id = format!("{}::{}", hostname, config_dir.display());

    let mut hasher = Sha256::new();
    hasher.update(SALT);
    hasher.update(machine_id.as_bytes());
    let result = hasher.finalize();

    let mut key = [0u8; 32];
    key.copy_from_slice(&result);
    Ok(key)
}

/// Get the path to the encrypted secrets file.
fn secrets_file_path() -> Result<PathBuf, String> {
    let config_dir = dirs::config_dir()
        .ok_or_else(|| "Could not determine config directory".to_string())?;
    Ok(config_dir.join(SECRETS_DIR).join(SECRETS_FILE))
}

/// Read the raw encrypted secrets file (returns empty JSON object if not found).
fn read_encrypted_store() -> Result<serde_json::Map<String, serde_json::Value>, String> {
    let path = secrets_file_path()?;
    if !path.exists() {
        return Ok(serde_json::Map::new());
    }

    let data = fs::read(&path).map_err(|e| format!("Failed to read secrets file: {e}"))?;

    // Decrypt
    let key = derive_encryption_key()?;
    let key = aes_gcm::Key::<Aes256Gcm>::from_slice(&key);
    let cipher = Aes256Gcm::new(key);

    // First 12 bytes = nonce, rest = ciphertext
    if data.len() < 13 {
        // Invalid format, return empty
        return Ok(serde_json::Map::new());
    }

    let (nonce_bytes, ciphertext) = data.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);

    let plaintext = match cipher.decrypt(nonce, ciphertext) {
        Ok(pt) => pt,
        Err(_) => {
            // Decryption failed (machine changed or data corrupted)
            return Ok(serde_json::Map::new());
        }
    };

    let parsed: serde_json::Value = serde_json::from_slice(&plaintext)
        .map_err(|e| format!("Failed to parse secrets: {e}"))?;

    match parsed {
        serde_json::Value::Object(map) => Ok(map),
        _ => Ok(serde_json::Map::new()),
    }
}

/// Write the encrypted secrets file.
fn write_encrypted_store(store: &serde_json::Map<String, serde_json::Value>) -> Result<(), String> {
    let path = secrets_file_path()?;

    // Create parent directory
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create secrets directory: {e}"))?;
    }

    let plaintext = serde_json::to_vec(store)
        .map_err(|e| format!("Failed to serialize secrets: {e}"))?;

    // Encrypt
    let key = derive_encryption_key()?;
    let key = aes_gcm::Key::<Aes256Gcm>::from_slice(&key);
    let cipher = Aes256Gcm::new(key);

    // Generate random 12-byte nonce
    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_ref())
        .map_err(|e| format!("Encryption failed: {e}"))?;

    // Write nonce || ciphertext
    let mut output = Vec::with_capacity(12 + ciphertext.len());
    output.extend_from_slice(&nonce_bytes);
    output.extend_from_slice(&ciphertext);

    fs::write(&path, &output).map_err(|e| format!("Failed to write secrets file: {e}"))?;

    Ok(())
}

/// Store a WebDAV password for the given username.
pub fn store_webdav_password(username: &str, password: &str) -> Result<(), String> {
    let mut store = read_encrypted_store()?;
    let encoded = base64::engine::general_purpose::STANDARD.encode(password.as_bytes());
    store.insert(username.to_string(), serde_json::Value::String(encoded));
    write_encrypted_store(&store)
}

/// Retrieve a WebDAV password for the given username.
pub fn get_webdav_password(username: &str) -> Result<String, String> {
    let store = read_encrypted_store()?;
    match store.get(username) {
        Some(serde_json::Value::String(encoded)) => {
            let bytes = base64::engine::general_purpose::STANDARD
                .decode(encoded)
                .map_err(|e| format!("Failed to decode password: {e}"))?;
            String::from_utf8(bytes).map_err(|e| format!("Invalid UTF-8 in password: {e}"))
        }
        _ => Err(format!("No stored password for user: {username}")),
    }
}

/// Delete a WebDAV password for the given username.
pub fn delete_webdav_password(username: &str) -> Result<(), String> {
    let mut store = read_encrypted_store()?;
    if store.remove(username).is_some() {
        write_encrypted_store(&store)
    } else {
        Ok(()) // Nothing to delete
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    /// Use a static mutex to serialize tests that touch the shared secrets file.
    static TEST_LOCK: Mutex<()> = Mutex::new(());

    #[test]
    fn test_store_get_delete_roundtrip() {
        let _lock = TEST_LOCK.lock().unwrap();

        let username = "test_user_roundtrip";

        // Clean up first in case of previous failed run
        let _ = delete_webdav_password(username);

        // Store
        store_webdav_password(username, "my_secret_pass!@#").unwrap();

        // Get
        let retrieved = get_webdav_password(username).unwrap();
        assert_eq!(retrieved, "my_secret_pass!@#");

        // Delete
        delete_webdav_password(username).unwrap();

        // Verify deleted
        let result = get_webdav_password(username);
        assert!(result.is_err());
    }

    #[test]
    fn test_multiple_users() {
        let _lock = TEST_LOCK.lock().unwrap();

        // Clean up
        let _ = delete_webdav_password("user_a");
        let _ = delete_webdav_password("user_b");

        store_webdav_password("user_a", "password_a").unwrap();
        store_webdav_password("user_b", "password_b").unwrap();

        assert_eq!(get_webdav_password("user_a").unwrap(), "password_a");
        assert_eq!(get_webdav_password("user_b").unwrap(), "password_b");

        // Delete only user_a
        delete_webdav_password("user_a").unwrap();
        assert!(get_webdav_password("user_a").is_err());
        assert_eq!(get_webdav_password("user_b").unwrap(), "password_b");

        // Clean up
        let _ = delete_webdav_password("user_b");
    }

    #[test]
    fn test_delete_nonexistent() {
        let _lock = TEST_LOCK.lock().unwrap();
        // Should not error
        delete_webdav_password("nonexistent_user_delete_test").unwrap();
    }

    #[test]
    fn test_get_nonexistent() {
        let _lock = TEST_LOCK.lock().unwrap();
        let result = get_webdav_password("nonexistent_user_get_test");
        assert!(result.is_err());
    }
}
