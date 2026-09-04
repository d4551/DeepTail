use super::super::tests::{empty_listing, grant, oauth, ControlPlane};
use super::*;

#[test]
fn reads_the_device_fields_the_api_documents() {
    let device: TailnetDevice = serde_json::from_str(
        r#"{
          "addresses": ["100.101.102.103", "fd7a:115c:a1e0::1"],
          "id": "92960230385",
          "nodeId": "nMCsaV52j811CNTRL",
          "name": "workstation.tail1234.ts.net",
          "hostname": "workstation",
          "os": "linux",
          "lastSeen": "2026-09-02T05:00:00Z",
          "tags": ["tag:harness"],
          "authorized": true,
          "isExternal": false,
          "clientVersion": "1.90.0",
          "machineKey": "mkey:abc"
        }"#,
    )
    .expect("the documented device object parses");
    assert_eq!(device.id, "92960230385");
    assert_eq!(device.node_id, "nMCsaV52j811CNTRL");
    assert_eq!(device.hostname, "workstation");
    assert_eq!(device.addresses.len(), 2);
    assert_eq!(device.tags, vec!["tag:harness".to_owned()]);
    assert!(device.authorized);
    assert!(!device.is_external);
}

#[test]
fn tolerates_a_device_object_missing_its_optional_fields() {
    // External devices come back with several fields absent, and a listing
    // that refuses the whole page because one device is shared in would
    // hide every device beside it.
    let device: TailnetDevice =
        serde_json::from_str(r#"{"id":"1","name":"shared.tail1234.ts.net"}"#)
            .expect("a sparse device parses");
    assert_eq!(device.hostname, "");
    assert!(device.addresses.is_empty());
    assert!(!device.authorized);
}

#[test]
fn dials_magic_dns_when_the_tailnet_has_it() {
    let device: TailnetDevice = serde_json::from_str(
        r#"{"id":"1","name":"Workstation.Tail1234.ts.net.","addresses":["100.64.0.1"]}"#,
    )
    .expect("parses");
    assert_eq!(
        device.dial_host().as_deref(),
        Some("workstation.tail1234.ts.net")
    );
}

#[test]
fn falls_back_to_an_address_and_brackets_ipv6() {
    let v4: TailnetDevice =
        serde_json::from_str(r#"{"id":"1","name":"","addresses":["100.64.0.1"]}"#)
            .expect("parses");
    assert_eq!(v4.dial_host().as_deref(), Some("100.64.0.1"));
    let v6: TailnetDevice =
        serde_json::from_str(r#"{"id":"1","name":"","addresses":["fd7a:115c:a1e0::1"]}"#)
            .expect("parses");
    assert_eq!(v6.dial_host().as_deref(), Some("[fd7a:115c:a1e0::1]"));
    let none: TailnetDevice = serde_json::from_str(r#"{"id":"1","name":""}"#).expect("parses");
    assert_eq!(none.dial_host(), None);
}

#[tokio::test]
async fn presents_the_bearer_it_was_granted_when_it_lists() {
    let plane = ControlPlane::start(vec![
        grant("tok-1", 3600),
        (200, r#"{"devices":[{"id":"1","name":"a.ts.net"}]}"#.to_owned()),
    ])
    .await;
    let client = TailscaleClient::at(reqwest::Client::new(), &plane.base, oauth());
    let devices = client.devices(DEFAULT_TAILNET).await.expect("the listing succeeds");
    assert_eq!(devices.len(), 1);
    let requests = plane.requests();
    let listing = requests.get(1).expect("the listing reached the control plane");
    assert!(listing.contains("authorization: Bearer tok-1"), "listing sent: {listing}");
    assert!(listing.contains("fields=all"), "listing sent: {listing}");
}

#[tokio::test]
async fn presents_an_api_key_as_basic_with_no_password() {
    // Tailscale authenticates an API key as the username of a Basic pair,
    // which is `dGVzdC1rZXk6` — "test-key:" — and not a bearer.
    let plane = ControlPlane::start(vec![empty_listing()]).await;
    let client =
        TailscaleClient::at(reqwest::Client::new(), &plane.base, Credential::ApiKey { key: "test-key".to_owned() });
    client.devices(DEFAULT_TAILNET).await.expect("the listing succeeds");
    let requests = plane.requests();
    let listing = requests.first().expect("the listing reached the control plane");
    assert!(listing.contains("authorization: Basic dGVzdC1rZXk6"), "listing sent: {listing}");
    assert_eq!(plane.token_exchanges(), 0, "an API key mints nothing");
}

#[tokio::test]
async fn reuses_a_token_that_is_outside_its_renewal_margin() {
    let plane = ControlPlane::start(vec![grant("tok-1", 3600), empty_listing(), empty_listing()]).await;
    let client = TailscaleClient::at(reqwest::Client::new(), &plane.base, oauth());
    client.devices(DEFAULT_TAILNET).await.expect("first listing");
    client.devices(DEFAULT_TAILNET).await.expect("second listing");
    assert_eq!(plane.token_exchanges(), 1, "the second listing minted a second token");
}

#[tokio::test]
async fn mints_again_for_a_token_inside_its_renewal_margin() {
    // A lifetime under the margin means the token is already due, so the
    // second listing has to mint rather than present a bearer the control
    // plane is about to reject.
    let plane =
        ControlPlane::start(vec![grant("tok-1", 5), empty_listing(), grant("tok-2", 5), empty_listing()]).await;
    let client = TailscaleClient::at(reqwest::Client::new(), &plane.base, oauth());
    client.devices(DEFAULT_TAILNET).await.expect("first listing");
    client.devices(DEFAULT_TAILNET).await.expect("second listing");
    assert_eq!(plane.token_exchanges(), 2, "the second listing reused a token that was due");
    let requests = plane.requests();
    let second = requests.get(3).expect("the second listing reached the control plane");
    assert!(second.contains("authorization: Bearer tok-2"), "second listing sent: {second}");
}

#[tokio::test]
async fn reports_a_refused_credential_as_unauthorized_rather_than_as_transport() {
    for status in [401_u16, 403] {
        let plane = ControlPlane::start(vec![(status, "{}".to_owned())]).await;
        let client =
            TailscaleClient::at(reqwest::Client::new(), &plane.base, Credential::ApiKey { key: "k".to_owned() });
        let error = client.devices(DEFAULT_TAILNET).await.expect_err("the credential is refused");
        assert!(
            matches!(error, TailscaleError::Unauthorized(code) if code == status),
            "HTTP {status} must map to Unauthorized, got {error:?}"
        );
    }
}

#[tokio::test]
async fn asks_the_token_endpoint_with_a_form_encoded_client_credentials_grant() {
    // Tailscale's token endpoint takes the OAuth 2.0 client-credentials
    // form body. Sending the same fields as JSON is refused by the real
    // control plane and by nothing here until this reads the body.
    let plane = ControlPlane::start(vec![grant("tok-1", 3600), empty_listing()]).await;
    let client = TailscaleClient::at(reqwest::Client::new(), &plane.base, oauth());
    client.devices(DEFAULT_TAILNET).await.expect("the listing succeeds");
    let requests = plane.requests();
    let exchange = requests.first().expect("the exchange reached the control plane");
    assert!(
        exchange.contains("content-type: application/x-www-form-urlencoded"),
        "exchange sent: {exchange}"
    );
    assert!(exchange.contains("grant_type=client_credentials"), "exchange sent: {exchange}");
    assert!(exchange.contains("client_id=id"), "exchange sent: {exchange}");
    assert!(exchange.contains("client_secret=secret"), "exchange sent: {exchange}");
}

#[tokio::test]
async fn mints_again_after_a_refused_exchange_rather_than_caching_the_failure() {
    // A refused exchange that wrote to the cache would lock the tailnet out
    // for the token's whole lifetime after one transient rejection.
    let plane = ControlPlane::start(vec![
        (401, "{}".to_owned()),
        grant("tok-1", 3600),
        empty_listing(),
    ])
    .await;
    let client = TailscaleClient::at(reqwest::Client::new(), &plane.base, oauth());
    client.devices(DEFAULT_TAILNET).await.expect_err("the first exchange is refused");
    client.devices(DEFAULT_TAILNET).await.expect("the second listing succeeds");
    assert_eq!(plane.token_exchanges(), 2, "the refusal was cached");
    let requests = plane.requests();
    let listing = requests.get(2).expect("the listing reached the control plane");
    assert!(listing.contains("authorization: Bearer tok-1"), "listing sent: {listing}");
}

#[tokio::test]
async fn treats_a_grant_with_no_lifetime_as_already_expired() {
    // Tailscale sends `expires_in`; a grant without one has no known age,
    // and caching it forever presents a bearer the control plane may have
    // stopped honouring.
    let plane = ControlPlane::start(vec![
        (200, r#"{"access_token":"tok-1"}"#.to_owned()),
        empty_listing(),
        (200, r#"{"access_token":"tok-2"}"#.to_owned()),
        empty_listing(),
    ])
    .await;
    let client = TailscaleClient::at(reqwest::Client::new(), &plane.base, oauth());
    client.devices(DEFAULT_TAILNET).await.expect("first listing");
    client.devices(DEFAULT_TAILNET).await.expect("second listing");
    assert_eq!(plane.token_exchanges(), 2, "a grant with no lifetime was cached");
}

#[tokio::test]
async fn reports_a_refused_token_exchange_rather_than_listing_without_one() {
    let plane = ControlPlane::start(vec![(401, "{}".to_owned())]).await;
    let client = TailscaleClient::at(reqwest::Client::new(), &plane.base, oauth());
    let error = client.devices(DEFAULT_TAILNET).await.expect_err("the exchange is refused");
    assert!(matches!(error, TailscaleError::Unauthorized(401)), "got {error:?}");
    assert_eq!(plane.requests().len(), 1, "nothing was listed without a token");
}

#[tokio::test]
async fn refuses_a_tailnet_name_before_it_reaches_the_wire() {
    let plane = ControlPlane::start(vec![empty_listing()]).await;
    let client = TailscaleClient::at(reqwest::Client::new(), &plane.base, oauth());
    let error = client.devices("../keys").await.expect_err("the name is refused");
    assert!(matches!(error, TailscaleError::Tailnet(_)), "got {error:?}");
    assert!(plane.requests().is_empty(), "an unusable name reached the wire");
}

#[test]
fn refuses_a_tailnet_name_that_would_escape_its_path_segment() {
    assert!(usable_tailnet("-"));
    assert!(usable_tailnet("example.com"));
    assert!(usable_tailnet("person@example.com"));
    assert!(!usable_tailnet(""));
    assert!(!usable_tailnet("../keys"));
    assert!(!usable_tailnet("example.com/devices"));
    assert!(!usable_tailnet("example.com?fields=all"));
    assert!(!usable_tailnet(&"a".repeat(254)));
}
