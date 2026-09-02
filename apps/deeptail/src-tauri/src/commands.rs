//! The complete JavaScript-facing surface. Every command here is named in
//! `build.rs`, and no other Rust function is reachable from the webview.
//!
//! The device token appears in no return value. A page can ask us to call a
//! host; it can never learn what we present when we do.

use tauri::State;
use tauri::ipc::Channel;

use crate::AppState;
use crate::carrier::{self, FetchRequest, FetchResponse, MuxFrame};
use crate::hosts::HostRecord;
use crate::pairing::{self, PairingGrant};
use crate::tailscale::{Credential, DEFAULT_TAILNET, TailnetDevice, TailscaleClient};

/// Errors are returned to the webview as plain strings; the frontend renders
/// them through its own locale dictionaries rather than surfacing Rust text.
type CommandResult<T> = Result<T, String>;

/// Every paired host.
#[tauri::command]
pub fn list_hosts(state: State<'_, AppState>) -> CommandResult<Vec<HostRecord>> {
    state.hosts.list().map_err(|e| e.to_string())
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

    let record = HostRecord {
        id: grant.device_id.clone(),
        label,
        origin,
    };
    // Store the secret first: a registry entry whose token failed to save would
    // present as a paired host that can never connect.
    state
        .secrets
        .store(&grant.device_id, &grant.token)
        .map_err(|e| e.to_string())?;
    state
        .hosts
        .upsert(record.clone())
        .map_err(|e| e.to_string())?;
    Ok(record)
}

/// One tailnet device, reduced to what the picker draws and pairs against.
///
/// The account this listing was made with does not appear here, and neither
/// does anything a page could replay against Tailscale: the webview receives
/// machines, never the key that listed them.
#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TailnetHost {
    /// Tailscale's device id, stable across renames.
    pub id: String,
    /// The machine name a person recognises, falling back to the MagicDNS name.
    pub label: String,
    /// The origin to pair against, already normalized and admitted.
    pub origin: String,
    /// Operating system as Tailscale reports it.
    pub os: String,
    /// RFC 3339 instant the control plane last heard from the device.
    pub last_seen: String,
    /// Tags the tailnet applies to this device.
    pub tags: Vec<String>,
    /// False while an admin has yet to approve the device, which is listed but
    /// not yet reachable.
    pub authorized: bool,
    /// True when this host is already paired, so the picker offers to open it
    /// rather than to pair it twice.
    pub paired: bool,
}

/// The port `dsh web` listens on unless it was told otherwise.
const DEFAULT_HARNESS_PORT: u16 = 3080;

/// Turn one tailnet device into a pairable host, or drop it.
///
/// A device with no dialable name is dropped rather than listed: there is
/// nothing to pair against, and a row that cannot be acted on is worse than an
/// absent one. `is_external` devices are dropped for the same reason — a device
/// shared in from another tailnet is reachable only if that tailnet's ACLs say
/// so, which this list cannot see.
fn as_tailnet_host(device: &TailnetDevice, paired: &[HostRecord]) -> Option<TailnetHost> {
    if device.is_external {
        return None;
    }
    let dial = device.dial_host()?;
    let origin =
        HostRecord::canonical_origin(&format!("http://{dial}:{DEFAULT_HARNESS_PORT}")).ok()?;
    let label = if device.hostname.is_empty() {
        dial.clone()
    } else {
        device.hostname.clone()
    };
    Some(TailnetHost {
        id: device.id.clone(),
        label,
        paired: paired.iter().any(|host| host.origin == origin),
        origin,
        os: device.os.clone(),
        last_seen: device.last_seen.clone(),
        tags: device.tags.clone(),
        authorized: device.authorized,
    })
}

/// Whether a tailnet credential is stored, so the picker knows which door to
/// open without asking the operator to type one in first.
#[tauri::command]
pub fn tailscale_connected(state: State<'_, AppState>) -> CommandResult<bool> {
    state
        .secrets
        .tailnet_credential()
        .map(|c| c.is_some())
        .map_err(|e| e.to_string())
}

/// Store a tailnet credential, after proving it can list the tailnet.
///
/// The listing happens first. A credential that is stored and then found not to
/// work presents as an app connected to Tailscale that returns nothing, and the
/// operator has no way to tell that from an empty tailnet.
#[tauri::command]
pub async fn tailscale_connect(
    state: State<'_, AppState>,
    credential: Credential,
    tailnet: Option<String>,
) -> CommandResult<Vec<TailnetHost>> {
    let tailnet = tailnet.unwrap_or_else(|| DEFAULT_TAILNET.to_owned());
    let devices = TailscaleClient::new(state.http.clone(), credential.clone())
        .devices(&tailnet)
        .await
        .map_err(|e| e.to_string())?;
    state
        .secrets
        .store_tailnet_credential(&credential)
        .map_err(|e| e.to_string())?;
    let paired = state.hosts.list().map_err(|e| e.to_string())?;
    Ok(devices
        .iter()
        .filter_map(|device| as_tailnet_host(device, &paired))
        .collect())
}

/// Every device on the tailnet, using the stored credential.
#[tauri::command]
pub async fn tailscale_devices(
    state: State<'_, AppState>,
    tailnet: Option<String>,
) -> CommandResult<Vec<TailnetHost>> {
    let credential = state
        .secrets
        .tailnet_credential()
        .map_err(|e| e.to_string())?
        .ok_or("no Tailscale credential is stored; connect a tailnet first")?;
    let tailnet = tailnet.unwrap_or_else(|| DEFAULT_TAILNET.to_owned());
    let devices = TailscaleClient::new(state.http.clone(), credential)
        .devices(&tailnet)
        .await
        .map_err(|e| e.to_string())?;
    let paired = state.hosts.list().map_err(|e| e.to_string())?;
    Ok(devices
        .iter()
        .filter_map(|device| as_tailnet_host(device, &paired))
        .collect())
}

/// Drop the tailnet credential. Hosts already paired keep working: they hold
/// their own device tokens and were never reached through this credential.
#[tauri::command]
pub fn tailscale_forget(state: State<'_, AppState>) -> CommandResult<()> {
    state
        .secrets
        .forget_tailnet_credential()
        .map_err(|e| e.to_string())
}

/// Refuse a response the host did not answer with success.
///
/// A refusal has no body worth parsing, so reading one anyway reports the
/// parser's complaint — "EOF while parsing a value" — in place of the only
/// thing the operator can act on, which is that the host turned the request
/// down and why.
fn admit(response: FetchResponse, what: &str) -> CommandResult<FetchResponse> {
    if (200..300).contains(&response.status) {
        return Ok(response);
    }
    if response.status == 401 || response.status == 403 {
        return Err(format!(
            "host rejected the device token (HTTP {}); pair this host again",
            response.status
        ));
    }
    Err(format!("{what} returned HTTP {}", response.status))
}

/// Fetch the host's index-injection table — the ordered boot rows the served
/// page would have carried in its HTML.
#[tauri::command]
pub async fn boot_injections(
    state: State<'_, AppState>,
    host: String,
) -> CommandResult<serde_json::Value> {
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
    let admitted = admit(response, "the boot table")?;
    serde_json::from_str(&admitted.body).map_err(|e| e.to_string())
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
        FetchRequest {
            path,
            method: "GET".to_owned(),
            headers: Vec::new(),
            body: None,
        },
    )
    .await?;
    Ok(admit(response, "the bundle request")?.body)
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
pub fn carrier_send_mux(
    state: State<'_, AppState>,
    host: String,
    data: String,
) -> CommandResult<()> {
    state.sockets.send(&host, data)
}

/// Close the mux socket. The frontend calls this when the app backgrounds:
/// mobile suspends the process, and a socket the OS silently killed would
/// otherwise look open until the first failed send.
#[tauri::command]
pub fn carrier_close_mux(state: State<'_, AppState>, host: String) -> CommandResult<()> {
    state.sockets.close(&host)
}

/// Resolve a host and its token, then make the call.
async fn authenticated(
    state: &State<'_, AppState>,
    host_id: &str,
    request: FetchRequest,
) -> CommandResult<FetchResponse> {
    let record = state.hosts.get(host_id).map_err(|e| e.to_string())?;
    let token = state.secrets.token(host_id).map_err(|e| e.to_string())?;
    carrier::call(&state.http, &record, &token, request)
        .await
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// One response with the given status and an empty body.
    fn answered(status: u16) -> FetchResponse {
        FetchResponse {
            status,
            headers: Vec::new(),
            body: String::new(),
        }
    }

    #[test]
    fn admits_every_success() {
        for status in [200, 201, 204, 299] {
            assert!(
                admit(answered(status), "the boot table").is_ok(),
                "status {status}"
            );
        }
    }

    #[test]
    fn names_a_refused_token_as_something_to_act_on() {
        for status in [401, 403] {
            let message = admit(answered(status), "the boot table").expect_err("a refusal");
            // Not the JSON parser's complaint about an empty body, which is
            // what a caller that read the body regardless would have reported.
            assert!(
                message.contains("pair this host again"),
                "status {status}: {message}"
            );
        }
    }

    #[test]
    fn names_what_failed_for_every_other_refusal() {
        let message = admit(answered(503), "the boot table").expect_err("a refusal");
        assert!(message.contains("the boot table"), "{message}");
        assert!(message.contains("503"), "{message}");
    }
}
