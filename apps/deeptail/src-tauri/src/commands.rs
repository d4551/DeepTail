//! The complete JavaScript-facing surface. Every command here is named in
//! `build.rs`, and no other Rust function is reachable from the webview.
//!
//! The device token appears in no return value. A page can ask us to call a
//! host; it can never learn what we present when we do.

use tauri::ipc::Channel;
use tauri::State;

use crate::carrier::{self, FetchRequest, FetchResponse, MuxFrame};
use crate::hosts::HostRecord;
use crate::pairing::{self, PairingGrant};
use crate::AppState;

/// Errors are returned to the webview as plain strings; the frontend renders
/// them through its own locale dictionaries rather than surfacing Rust text.
type CommandResult<T> = Result<T, String>;

/// Every paired host.
#[tauri::command]
pub fn list_hosts(state: State<'_, AppState>) -> Vec<HostRecord> {
    state.hosts.list()
}

/// Resolve one host for the frontend's boot sequence. Proves a device token is
/// present before the shell starts, so a missing credential surfaces as a
/// pairing prompt rather than a wall of failed requests.
#[tauri::command]
pub fn select_host(state: State<'_, AppState>, host: String) -> CommandResult<HostRecord> {
    let record = state.hosts.get(&host).map_err(|e| e.to_string())?;
    state.secrets.token(&host).map_err(|e| e.to_string())?;
    Ok(record)
}

/// Remove a host and its device token. The token is dropped first: a registry
/// entry with no credential is a recoverable state, an orphaned credential is
/// not.
#[tauri::command]
pub fn forget_host(state: State<'_, AppState>, host: String) -> CommandResult<()> {
    state.secrets.forget(&host).map_err(|e| e.to_string())?;
    state.hosts.remove(&host).map_err(|e| e.to_string())
}

/// Spend a printed launch token on a long-lived device grant, then file the
/// grant in the platform credential store.
#[tauri::command]
pub async fn pair_host(
    state: State<'_, AppState>,
    link: String,
    label: String,
) -> CommandResult<HostRecord> {
    let (origin, launch_token) = pairing::parse_link(&link).map_err(|e| e.to_string())?;
    let response = state
        .http
        .post(format!("{origin}/api/device/pair"))
        .json(&serde_json::json!({ "launchToken": launch_token, "label": label }))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(pairing::PairingError::Rejected(response.status().as_u16()).to_string());
    }
    let grant: PairingGrant = response
        .json()
        .await
        .map_err(|e| pairing::PairingError::Malformed(e.to_string()).to_string())?;

    let record = HostRecord { id: grant.device_id.clone(), label, origin, last_seen: None };
    // Store the secret first: a registry entry whose token failed to save would
    // present as a paired host that can never connect.
    state.secrets.store(&grant.device_id, &grant.token).map_err(|e| e.to_string())?;
    state.hosts.upsert(record.clone()).map_err(|e| e.to_string())?;
    Ok(record)
}

/// Fetch the host's index-injection table — the ordered boot rows the served
/// page would have carried in its HTML.
#[tauri::command]
pub async fn boot_injections(state: State<'_, AppState>, host: String) -> CommandResult<serde_json::Value> {
    let response = authenticated(
        &state,
        &host,
        FetchRequest {
            path: "/api/boot".to_owned(),
            method: "GET".to_owned(),
            headers: Vec::new(),
            body: None,
        },
    )
    .await?;
    serde_json::from_str(&response.body).map_err(|e| e.to_string())
}

/// One unary `/api` call on the frontend's behalf.
#[tauri::command]
pub async fn carrier_fetch(
    state: State<'_, AppState>,
    host: String,
    request: FetchRequest,
) -> CommandResult<FetchResponse> {
    authenticated(&state, &host, request).await
}

/// Fetch one client plugin bundle. Returned as source text rather than
/// executed here: the frontend wraps it in a blob URL and runs it as a classic
/// script, which is why the app's CSP allows `script-src blob:` and no host.
#[tauri::command]
pub async fn carrier_load_bundle(
    state: State<'_, AppState>,
    host: String,
    path: String,
) -> CommandResult<String> {
    let response = authenticated(
        &state,
        &host,
        FetchRequest { path, method: "GET".to_owned(), headers: Vec::new(), body: None },
    )
    .await?;
    if response.status != 200 {
        return Err(format!("bundle request returned HTTP {}", response.status));
    }
    Ok(response.body)
}

/// Open the host's Remote stream mux and pump its frames to `channel`.
#[tauri::command]
pub async fn carrier_open_mux(
    state: State<'_, AppState>,
    host: String,
    channel: Channel<MuxFrame>,
) -> CommandResult<()> {
    let record = state.hosts.get(&host).map_err(|e| e.to_string())?;
    let token = state.secrets.token(&host).map_err(|e| e.to_string())?;
    state.sockets.open(&record, &token, channel).await
}

/// Send one text frame on the open mux socket.
#[tauri::command]
pub fn carrier_send_mux(state: State<'_, AppState>, host: String, data: String) -> CommandResult<()> {
    state.sockets.send(&host, data)
}

/// Close the mux socket. The frontend calls this when the app backgrounds:
/// mobile suspends the process, and a socket the OS silently killed would
/// otherwise look open until the first failed send.
#[tauri::command]
pub fn carrier_close_mux(state: State<'_, AppState>, host: String) {
    state.sockets.close(&host);
}

/// Resolve a host and its token, then make the call.
async fn authenticated(
    state: &State<'_, AppState>,
    host_id: &str,
    request: FetchRequest,
) -> CommandResult<FetchResponse> {
    let record = state.hosts.get(host_id).map_err(|e| e.to_string())?;
    let token = state.secrets.token(host_id).map_err(|e| e.to_string())?;
    carrier::call(&state.http, &record, &token, request).await.map_err(|e| e.to_string())
}
