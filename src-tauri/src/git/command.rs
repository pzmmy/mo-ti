use std::io;
use std::path::Path;
use std::process::Output;
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

use super::git_command;

/// Timeout durations per git subcommand.
const TIMEOUT_CLONE: Duration = Duration::from_secs(120);
const TIMEOUT_PUSH: Duration = Duration::from_secs(60);
const TIMEOUT_PULL: Duration = Duration::from_secs(60);
const TIMEOUT_DEFAULT: Duration = Duration::from_secs(30);

/// Spawn a git command in `dir`, wait for it with an operation-specific
/// timeout, and return the result.  If the process doesn't finish in time it
/// is killed and an `io::ErrorKind::TimedOut` error is returned with a
/// Chinese-language message.
pub(super) fn git_output(dir: &Path, args: &[&str]) -> io::Result<Output> {
    let cmd = git_command().args(args);
    spawn_and_wait(cmd, dir, args)
}

/// Like [`git_output`] but accepts a pre-configured [`Command`] and
/// appends extra `args` before spawning.  Used when a caller needs to
/// inject flags (e.g. `-c commit.gpgsign=false`) before the subcommand.
pub(super) fn git_output_with_args(
    mut cmd: std::process::Command,
    dir: &Path,
    extra_args: &[&str],
) -> io::Result<Output> {
    cmd.args(extra_args);
    // Build a synthetic arg slice for timeout/label detection.
    // We can't borrow from `cmd`, so we re-derive the label from extra_args.
    spawn_and_wait(cmd, dir, extra_args)
}

pub(super) fn git_output_result(dir: &Path, args: &[&str]) -> Result<Output, String> {
    git_output(dir, args).map_err(|e| format!("Failed to run git {}: {e}", git_command_label(args)))
}

pub(super) fn run_git(dir: &Path, args: &[&str]) -> Result<(), String> {
    let output = git_output_result(dir, args)?;

    if output.status.success() {
        return Ok(());
    }

    Err(stderr_text(&output))
}

pub(super) fn stdout_text(output: &Output) -> String {
    String::from_utf8_lossy(&output.stdout).trim().to_string()
}

pub(super) fn stdout_lines(output: &Output) -> Vec<String> {
    stdout_text(output)
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(ToOwned::to_owned)
        .collect()
}

pub(super) fn stderr_text(output: &Output) -> String {
    String::from_utf8_lossy(&output.stderr).trim().to_string()
}

pub(super) fn stderr_or_failure(command: &str, output: &Output) -> String {
    let stderr = stderr_text(output);
    if stderr.is_empty() {
        format!("{command} failed")
    } else {
        stderr
    }
}

pub(super) fn git_command_label<'a>(args: &'a [&'a str]) -> &'a str {
    if args.first() == Some(&"-c") {
        return args.get(2).copied().unwrap_or(args[0]);
    }

    args[0]
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/// Pick a timeout based on the first non-flag argument (the git subcommand).
fn timeout_for_git_command(args: &[&str]) -> Duration {
    let subcmd = args
        .iter()
        .find(|a| !a.starts_with('-'))
        .copied()
        .unwrap_or_default();

    match subcmd {
        "clone" => TIMEOUT_CLONE,
        "push" => TIMEOUT_PUSH,
        "pull" => TIMEOUT_PULL,
        _ => TIMEOUT_DEFAULT,
    }
}

/// Spawn `cmd` (already configured with args + dir), wait with a timeout
/// derived from `label_args`, kill the child on timeout.
fn spawn_and_wait(mut cmd: std::process::Command, dir: &Path, label_args: &[&str]) -> io::Result<Output> {
    spawn_command(cmd.current_dir(dir), label_args)
}

/// Like [`spawn_and_wait`] but without setting a working directory.
/// Use when the command carries its destination as a positional argument.
pub(super) fn spawn_command(mut cmd: std::process::Command, label_args: &[&str]) -> io::Result<Output> {
    let label = git_command_label(label_args);
    let timeout = timeout_for_git_command(label_args);

    let mut child = cmd.spawn()?;
    let pid = child.id();

    let (tx, rx) = mpsc::channel();
    thread::spawn(move || {
        let result = child.wait_with_output();
        let _ = tx.send(result);
    });

    match rx.recv_timeout(timeout) {
        Ok(output) => output,
        Err(mpsc::RecvTimeoutError::Timeout) => {
            kill_process(pid);
            Err(io::Error::new(
                io::ErrorKind::TimedOut,
                format!(
                    "git {} 操作超时（已超过 {} 秒），已强制终止",
                    label,
                    timeout.as_secs(),
                ),
            ))
        }
        Err(mpsc::RecvTimeoutError::Disconnected) => Err(io::Error::new(
            io::ErrorKind::Other,
            "git 进程意外断开",
        )),
    }
}

/// Kill a process by PID.
///
/// On Unix we use `kill -TERM`; on Windows we use `taskkill /F`.
fn kill_process(pid: u32) {
    #[cfg(unix)]
    {
        let _ = std::process::Command::new("kill")
            .args(["-TERM", &pid.to_string()])
            .output();
    }
    #[cfg(not(unix))]
    {
        let _ = std::process::Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/F"])
            .output();
    }
}
