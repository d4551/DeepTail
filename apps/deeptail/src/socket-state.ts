/**
 * The `WebSocket` constants this product compares against and sends.
 *
 * The mux runs over Tauri IPC rather than a real socket, so the constants are
 * written out rather than read off a `WebSocket` — but written once, because
 * two modules comparing against their own copies of a protocol number is how
 * they come to disagree about what open means.
 *
 * @module
 */

/** `WebSocket.CONNECTING`: the socket exists but the handshake has not settled. */
export const SOCKET_CONNECTING = 0

/** `WebSocket.OPEN`, which the harness mux client compares `readyState` against. */
export const SOCKET_OPEN = 1

/** `WebSocket.CLOSED`. */
export const SOCKET_CLOSED = 3

/** RFC 6455 close code 1000: the endpoint closed the connection deliberately. */
export const SOCKET_CLOSE_NORMAL = 1000

/** RFC 6455 close code 1006: the connection was lost without a close frame. */
export const SOCKET_CLOSE_ABNORMAL = 1006
