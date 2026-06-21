use std::path::Path;

#[cfg(target_os = "macos")]
use std::io::Write;
#[cfg(target_os = "macos")]
use std::process::Stdio;

#[cfg(target_os = "macos")]
use super::git_command;

/// Pre-populate the macOS git credential helper so git doesn't prompt interactively.
///
/// On macOS, sends a `git credential fill` request for the given remote URL,
/// prompting the keychain to return cached credentials. No-op on other platforms.
#[cfg(target_os = "macos")]
pub(super) fn request_remote_credentials(vault: &Path, remote_url: &str) {
    let Some(input) = credential_fill_input(remote_url) else {
        return;
    };

    let mut child = match git_command()
        .args(["credential", "fill"])
        .current_dir(vault)
        .env("GIT_TERMINAL_PROMPT", "0")
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
    {
        Ok(child) => child,
        Err(_) => return,
    };

    if let Some(mut stdin) = child.stdin.take() {
        let _ = stdin.write_all(input.as_bytes());
    }
    let _ = child.wait();
}

/// No-op credentials request on non-macOS platforms.
#[cfg(not(target_os = "macos"))]
pub(super) fn request_remote_credentials(_vault: &Path, _remote_url: &str) {}

/// Parsed components of a remote URL for credential helper input.
#[cfg(any(test, target_os = "macos"))]
struct CredentialTarget<'a> {
    protocol: &'a str,
    host: &'a str,
    username: Option<&'a str>,
    path: Option<&'a str>,
}

/// Build the stdin input for `git credential fill` from a remote URL.
#[cfg(any(test, target_os = "macos"))]
fn credential_fill_input(remote_url: &str) -> Option<String> {
    let target = credential_target(remote_url)?;
    let mut lines = vec![
        format!("protocol={}", target.protocol),
        format!("host={}", target.host),
    ];

    if let Some(username) = target.username {
        lines.push(format!("username={username}"));
    }

    if let Some(path) = target.path {
        lines.push(format!("path={path}"));
    }

    Some(format!("{}\n\n", lines.join("\n")))
}

/// Parse a remote URL into structured credential target components.
#[cfg(any(test, target_os = "macos"))]
fn credential_target(remote_url: &str) -> Option<CredentialTarget<'_>> {
    let (protocol, rest) = remote_url.trim().split_once("://")?;
    if !matches!(protocol, "https" | "http") {
        return None;
    }

    let rest = rest.split_once('#').map_or(rest, |(value, _)| value);
    let rest = rest.split_once('?').map_or(rest, |(value, _)| value);
    let (authority, path) = rest.split_once('/').unwrap_or((rest, ""));
    if authority.is_empty() {
        return None;
    }

    let (username, host) = match authority.rsplit_once('@') {
        Some((userinfo, host)) => {
            let username = userinfo
                .split_once(':')
                .map_or(userinfo, |(name, _)| name)
                .trim();
            let username = (!username.is_empty()).then_some(username);
            (username, host)
        }
        None => (None, authority),
    };

    if host.is_empty() {
        return None;
    }

    Some(CredentialTarget {
        protocol,
        host,
        username,
        path: (!path.is_empty()).then_some(path),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn credential_fill_input_extracts_https_remote_parts() {
        let input = credential_fill_input("https://github.com/refactoringhq/tolaria.git").unwrap();

        assert!(input.contains("protocol=https\n"));
        assert!(input.contains("host=github.com\n"));
        assert!(input.contains("path=refactoringhq/tolaria.git\n"));
        assert!(input.ends_with("\n\n"));
    }

    #[test]
    fn credential_fill_input_ignores_ssh_remotes() {
        assert!(credential_fill_input("git@github.com:refactoringhq/tolaria.git").is_none());
    }
}
