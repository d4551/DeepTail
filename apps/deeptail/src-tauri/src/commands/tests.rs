use super::*;

/// One tailnet device, with everything a listing supplies.
fn device(id: &str, name: &str, hostname: &str) -> TailnetDevice {
    TailnetDevice {
        id: id.to_owned(),
        node_id: String::new(),
        name: name.to_owned(),
        hostname: hostname.to_owned(),
        addresses: vec!["100.64.0.1".to_owned()],
        os: "linux".to_owned(),
        last_seen: String::new(),
        tags: Vec::new(),
        authorized: true,
        is_external: false,
    }
}

/// One paired host at the origin the device above resolves to.
fn paired_at(origin: &str) -> Vec<HostRecord> {
    vec![HostRecord {
        id: "h".to_owned(),
        label: "Paired".to_owned(),
        origin: origin.to_owned(),
    }]
}

#[test]
fn builds_a_pairable_host_from_a_machine_on_the_tailnet() {
    let mut machine = device("1", "workstation.tail1234.ts.net", "workstation");
    machine.last_seen = "2026-09-02T05:00:00Z".to_owned();
    machine.tags = vec!["tag:harness".to_owned()];
    let host = as_tailnet_host(&machine, &[]).expect("a machine with a name is pairable");
    assert_eq!(host.origin, "http://workstation.tail1234.ts.net:3080");
    assert_eq!(host.label, "workstation");
    assert!(!host.paired);
    // The picker draws all four, so all four are carried across rather than
    // silently dropped into an empty row.
    assert_eq!(host.id, "1");
    assert_eq!(host.os, "linux");
    assert_eq!(host.last_seen, "2026-09-02T05:00:00Z");
    assert_eq!(host.tags, vec!["tag:harness".to_owned()]);
}

#[test]
fn marks_a_machine_this_device_has_already_paired() {
    // Offering to pair an origin that is already paired writes a second
    // registry entry for one host, so the row has to know the difference.
    let machine = device("1", "workstation.tail1234.ts.net", "workstation");
    let host = as_tailnet_host(
        &machine,
        &paired_at("http://workstation.tail1234.ts.net:3080"),
    )
    .expect("still listed");
    assert!(host.paired);
    let elsewhere =
        as_tailnet_host(&machine, &paired_at("https://harness.example")).expect("still listed");
    assert!(!elsewhere.paired);
}

#[test]
fn drops_a_device_shared_in_from_another_tailnet() {
    // Reachability depends on the owning tailnet's ACLs, which this listing
    // cannot see, so the row would offer a pairing that may not work.
    let mut shared = device("1", "shared.tail1234.ts.net", "shared");
    shared.is_external = true;
    assert!(as_tailnet_host(&shared, &[]).is_none());
}

#[test]
fn drops_a_device_with_nothing_to_dial() {
    let mut nameless = device("1", "", "");
    nameless.addresses = Vec::new();
    assert!(as_tailnet_host(&nameless, &[]).is_none());
}

#[test]
fn falls_back_to_the_address_when_a_tailnet_has_no_magic_dns() {
    let host = as_tailnet_host(&device("1", "", ""), &[]).expect("an address is dialable");
    assert_eq!(host.origin, "http://100.64.0.1:3080");
    // With no hostname either, the dialed name is the only label there is.
    assert_eq!(host.label, "100.64.0.1");
}

#[test]
fn drops_a_machine_whose_name_is_not_an_admissible_origin() {
    // canonical_origin refuses plaintext off a tailnet, so a machine whose
    // name is not a tailnet peer cannot be offered over http.
    assert!(as_tailnet_host(&device("1", "harness.example", "harness"), &[]).is_none());
}

#[test]
fn keeps_an_unapproved_machine_listed_and_says_so() {
    let mut waiting = device("1", "lab.tail1234.ts.net", "lab");
    waiting.authorized = false;
    let host =
        as_tailnet_host(&waiting, &[]).expect("listed so its absence does not read as missing");
    assert!(!host.authorized);
}

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
