/**
 * The `WebSocket.readyState` values this product compares against.
 *
 * The mux runs over Tauri IPC rather than a real socket, so the constants are
 * written out rather than read off a `WebSocket` — but written once, because
 * two modules comparing against their own copies of a protocol number is how
 * they come to disagree about what open means.
 *
 * @module
 */

/** `WebSocket.OPEN`, which the harness mux client compares `readyState` against. */
export const SOCKET_OPEN = 1

/** `WebSocket.CLOSED`. */
export const SOCKET_CLOSED = 3
