/**
 * Every command the native half answers to, named once.
 *
 * A command name is this product's route: it is spelled in Rust, where
 * `generate_handler!` registers the function, and again here, where the page
 * invokes it. It was spelled here fifteen times over eight modules as bare
 * strings — one of them, `capability_grants`, bound to a constant, which is
 * where this file's shape came from.
 *
 * A route written at its call site is a route no reader can enumerate and no
 * checker can hold to the other side. A name misspelled on either plane
 * type-checks, builds, ships, and fails when a person presses the control:
 * `invoke` takes a string, and Rust never hears the call. `check:commands`
 * binds this list to the handler list so neither side can move alone.
 *
 * @module
 */

/** The native commands, by what each one does. */
export const NATIVE_COMMANDS = {
  bootInjections: 'boot_injections',
  capabilityGrants: 'capability_grants',
  carrierCloseMux: 'carrier_close_mux',
  carrierFetch: 'carrier_fetch',
  carrierLoadBundle: 'carrier_load_bundle',
  carrierOpenMux: 'carrier_open_mux',
  carrierSendMux: 'carrier_send_mux',
  forgetHost: 'forget_host',
  listHosts: 'list_hosts',
  pairHost: 'pair_host',
  selectHost: 'select_host',
  tailscaleConnect: 'tailscale_connect',
  tailscaleConnected: 'tailscale_connected',
  tailscaleDevices: 'tailscale_devices',
  tailscaleForget: 'tailscale_forget',
} as const

/** One command name the native half answers to. */
export type NativeCommand = (typeof NATIVE_COMMANDS)[keyof typeof NATIVE_COMMANDS]
