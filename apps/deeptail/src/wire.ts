/**
 * The shape of data that crossed the wire.
 *
 * A parsed JSON value is one of these, nothing else: the host's frames, the
 * RPC envelopes and the injection table are all read as this type and then
 * narrowed through runtime guards, so no unchecked value ever reaches the
 * surface code.
 *
 * @module
 */

/** A value JSON.parse can produce, which is every value the wire carries. */
export type Json = string | number | boolean | null | Json[] | { readonly [key: string]: Json }
