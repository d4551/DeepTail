//! Which addresses belong to a tailnet.
//!
//! This decides whether plaintext HTTP to a host is admissible. A tailnet peer
//! is reached over WireGuard, so `http://` to one is encrypted and
//! peer-authenticated on the wire even though the URL scheme does not say so;
//! the same URL to any other host is not. The ranges are Tailscale's own, and
//! the ChromeOS carve-out is theirs too: ChromeOS uses that slice of the CGNAT
//! space to reach its own containers, so Tailscale never assigns from it and
//! neither may this check.

use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};

/// The CGNAT range Tailscale assigns IPv4 addresses from.
const CGNAT: (Ipv4Addr, u32) = (Ipv4Addr::new(100, 64, 0, 0), 10);
/// The slice of CGNAT that ChromeOS uses for its own VMs, which Tailscale skips.
const CHROME_OS_VM: (Ipv4Addr, u32) = (Ipv4Addr::new(100, 115, 92, 0), 23);
/// The unique-local range Tailscale assigns IPv6 addresses from.
const TAILSCALE_ULA: (Ipv6Addr, u32) = (Ipv6Addr::new(0xfd7a, 0x115c, 0xa1e0, 0, 0, 0, 0, 0), 48);
/// The DNS suffix every MagicDNS name ends in.
const MAGIC_DNS_SUFFIX: &str = ".ts.net";

/// Whether an IPv4 address falls inside a prefix.
fn within_v4(address: Ipv4Addr, (network, bits): (Ipv4Addr, u32)) -> bool {
    let mask = u32::MAX.checked_shl(32 - bits).unwrap_or(0);
    u32::from(address) & mask == u32::from(network) & mask
}

/// Whether an IPv6 address falls inside a prefix.
fn within_v6(address: Ipv6Addr, (network, bits): (Ipv6Addr, u32)) -> bool {
    let mask = u128::MAX.checked_shl(128 - bits).unwrap_or(0);
    u128::from(address) & mask == u128::from(network) & mask
}

/// Whether an IP address is one Tailscale assigns to a tailnet peer.
#[must_use]
pub fn is_tailnet_address(address: IpAddr) -> bool {
    match address {
        IpAddr::V4(v4) => within_v4(v4, CGNAT) && !within_v4(v4, CHROME_OS_VM),
        // An IPv4-mapped address is the IPv4 address; judging it as IPv6 would
        // read ::ffff:100.64.0.1 as outside the ULA and admit nothing, while
        // reading it as IPv4 gives the same answer as the address it carries.
        IpAddr::V6(v6) => match v6.to_ipv4_mapped() {
            Some(v4) => within_v4(v4, CGNAT) && !within_v4(v4, CHROME_OS_VM),
            None => within_v6(v6, TAILSCALE_ULA),
        },
    }
}

/// Whether a URL host component names a tailnet peer.
///
/// Accepts a Tailscale-assigned literal address in either family, and a
/// MagicDNS name, which always ends in the tailnet's `.ts.net` suffix. A bare
/// short name is not accepted: it resolves through whatever search domain the
/// device happens to carry, which is not a statement about the tailnet.
#[must_use]
pub fn is_tailnet_host(host: &str) -> bool {
    let bare = host
        .strip_prefix('[')
        .and_then(|rest| rest.strip_suffix(']'))
        .unwrap_or(host);
    if let Ok(address) = bare.parse::<IpAddr>() {
        return is_tailnet_address(address);
    }
    let name = host.trim_end_matches('.').to_ascii_lowercase();
    name.ends_with(MAGIC_DNS_SUFFIX) && name.len() > MAGIC_DNS_SUFFIX.len()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ip(text: &str) -> IpAddr {
        text.parse().expect("test address parses")
    }

    #[test]
    fn admits_the_cgnat_range_tailscale_assigns_from() {
        assert!(is_tailnet_address(ip("100.64.0.1")));
        assert!(is_tailnet_address(ip("100.101.102.103")));
        assert!(is_tailnet_address(ip("100.127.255.254")));
    }

    #[test]
    fn refuses_addresses_outside_the_cgnat_range() {
        assert!(!is_tailnet_address(ip("100.63.255.255")));
        assert!(!is_tailnet_address(ip("100.128.0.0")));
        assert!(!is_tailnet_address(ip("10.0.0.1")));
        assert!(!is_tailnet_address(ip("192.168.1.1")));
        assert!(!is_tailnet_address(ip("8.8.8.8")));
    }

    #[test]
    fn refuses_the_chromeos_slice_tailscale_never_assigns() {
        assert!(!is_tailnet_address(ip("100.115.92.0")));
        assert!(!is_tailnet_address(ip("100.115.93.255")));
        // The addresses on either side of the carve-out stay admissible.
        assert!(is_tailnet_address(ip("100.115.91.255")));
        assert!(is_tailnet_address(ip("100.115.94.0")));
    }

    #[test]
    fn admits_the_tailscale_ipv6_range_only() {
        assert!(is_tailnet_address(ip("fd7a:115c:a1e0::1")));
        assert!(is_tailnet_address(ip(
            "fd7a:115c:a1e0:ab12:4843:cd96:6200:1"
        )));
        assert!(!is_tailnet_address(ip("fd7a:115c:a1e1::1")));
        assert!(!is_tailnet_address(ip("fd00::1")));
        assert!(!is_tailnet_address(ip("::1")));
        assert!(!is_tailnet_address(ip("2606:4700::1")));
    }

    #[test]
    fn reads_an_ipv4_mapped_address_as_the_address_it_carries() {
        assert!(is_tailnet_address(ip("::ffff:100.64.0.1")));
        assert!(!is_tailnet_address(ip("::ffff:8.8.8.8")));
    }

    #[test]
    fn admits_magic_dns_names_and_nothing_shorter() {
        assert!(is_tailnet_host("workstation.tail1234.ts.net"));
        assert!(is_tailnet_host("Workstation.Tail1234.TS.NET"));
        assert!(is_tailnet_host("workstation.tail1234.ts.net."));
        assert!(!is_tailnet_host("ts.net"));
        assert!(!is_tailnet_host("workstation"));
        assert!(!is_tailnet_host("harness.example"));
        // A domain that merely ends in the same letters is not the suffix.
        assert!(!is_tailnet_host("notts.net"));
    }

    #[test]
    fn reads_a_bracketed_ipv6_url_host() {
        assert!(is_tailnet_host("[fd7a:115c:a1e0::1]"));
        assert!(!is_tailnet_host("[::1]"));
    }
}
