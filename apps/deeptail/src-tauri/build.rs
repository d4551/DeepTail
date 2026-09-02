fn main() {
    // Every registered command is callable from every window by default. The
    // bearer token never leaves Rust, but the commands that use it still must
    // not be reachable from a page we did not author, so the manifest names
    // the exact command surface.
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "list_hosts",
            "select_host",
            "forget_host",
            "pair_host",
            "boot_injections",
            "carrier_fetch",
            "carrier_load_bundle",
            "carrier_open_mux",
            "carrier_send_mux",
            "carrier_close_mux",
            "tailscale_connected",
            "tailscale_connect",
            "tailscale_devices",
            "tailscale_forget",
        ]),
    ))
    .expect("failed to run tauri-build");
}
