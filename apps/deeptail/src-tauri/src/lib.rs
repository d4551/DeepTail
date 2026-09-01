//! DeepTail's native half. It owns every byte that reaches a DeepSeek Harness
//! host: the host registry, the device token in platform-native secure
//! storage, the authenticated `/api` calls, the plugin-bundle fetches, and the
//! `/api/remote.mux` WebSocket.
//!
//! The webview never opens a network connection of its own. That is deliberate
//! and load-bearing rather than stylistic: Tauri serves the frontend from a
//! secure-context origin, so a page there cannot open a `ws://` socket at all,
//! and it cannot attach an `Authorization` header to a WebSocket handshake even
//! when it can reach one. Holding the socket in Rust removes both limits and
//! keeps the app's CSP free of any host entry.

use tauri::Manager;

mod carrier;
mod commands;
mod hosts;
mod pairing;
mod secrets;


/// How long to wait for a TCP+TLS handshake with a host.
const CONNECT_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(10);
/// How long any single `/api` call may take end to end.
const REQUEST_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(30);

/// Shared state every command reads: the host registry, the secret store, and
/// the live mux sockets keyed by host.
pub struct AppState {
    pub hosts: hosts::HostStore,
    pub secrets: secrets::SecretStore,
    pub sockets: carrier::MuxRegistry,
    pub http: reqwest::Client,
}

/// Build and run the application. Called by the desktop binary and, on mobile,
/// by the generated entry point below.
///
/// # Panics
/// Panics when the secure store cannot be initialised for this platform, which
/// is unrecoverable: without it no host credential can be read or written, and
/// continuing would silently present an app that can never connect.
pub fn run() {
    let secrets = secrets::SecretStore::initialize().expect("secure credential store unavailable");
    let http = reqwest::Client::builder()
        .user_agent(concat!("DeepTail/", env!("CARGO_PKG_VERSION")))
        // Without these a black-holed host hangs the IPC call, and with it the
        // screen that would otherwise report the host unreachable.
        .connect_timeout(CONNECT_TIMEOUT)
        .timeout(REQUEST_TIMEOUT)
        .build()
        .expect("failed to build the HTTP client");

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init());

    #[cfg(any(target_os = "android", target_os = "ios"))]
    let builder = builder
        .plugin(tauri_plugin_barcode_scanner::init())
        .plugin(tauri_plugin_biometric::init());

    builder
        .setup(move |app| {
            let hosts = hosts::HostStore::load(app.handle())?;
            app.manage(AppState {
                hosts,
                secrets,
                sockets: carrier::MuxRegistry::default(),
                http,
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_hosts,
            commands::select_host,
            commands::forget_host,
            commands::pair_host,
            commands::boot_injections,
            commands::carrier_fetch,
            commands::carrier_load_bundle,
            commands::carrier_open_mux,
            commands::carrier_send_mux,
            commands::carrier_close_mux,
        ])
        .run(tauri::generate_context!())
        .expect("error while running DeepTail");
}

#[cfg(mobile)]
#[tauri::mobile_entry_point]
fn mobile_entry_point() {
    run();
}
