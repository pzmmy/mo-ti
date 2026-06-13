use crate::webdav_secrets;

#[tauri::command]
pub fn store_webdav_password(username: String, password: String) -> Result<(), String> {
    webdav_secrets::store_webdav_password(&username, &password)
}

#[tauri::command]
pub fn get_webdav_password(username: String) -> Result<String, String> {
    webdav_secrets::get_webdav_password(&username)
}

#[tauri::command]
pub fn delete_webdav_password(username: String) -> Result<(), String> {
    webdav_secrets::delete_webdav_password(&username)
}
