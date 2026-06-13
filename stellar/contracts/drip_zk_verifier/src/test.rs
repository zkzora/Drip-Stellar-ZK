//! Tests for the Drip Private ZK verifier.
//!
//! The proof / VK / public-input fixtures under `test_fixtures/` are *real*
//! artifacts generated from the `drip_income_proof` Noir circuit with
//! Noir 1.0.0-beta.9 + Barretenberg 0.87.0:
//!
//!   amount = 5000 (private), salt = 123456789 (private)
//!   commitment = pedersen_hash([5000, 123456789])
//!              = 0x0491f0ab9c89e3dd6a07e9bb7606a49c335c84b91c0a2ca4a466d3ba5ef05cd5
//!   threshold  = 1000 (public)
//!
//! so the proof attests "the committed amount is >= 1000" without revealing
//! that the amount is 5000.

#![cfg(test)]

use soroban_sdk::{
    contract, contractimpl,
    testutils::Address as _,
    Address, Bytes, BytesN, Env,
};

use crate::{DripZkVerifier, DripZkVerifierClient, Error, StreamRecord, StreamStatus};

// Real UltraHonk artifacts for the drip_income_proof circuit.
const VK: &[u8] = include_bytes!("../test_fixtures/vk");
const PROOF: &[u8] = include_bytes!("../test_fixtures/proof");

// commitment = pedersen_hash([5000, 123456789]) as a 32-byte BE field element.
const COMMITMENT: [u8; 32] = [
    0x04, 0x91, 0xf0, 0xab, 0x9c, 0x89, 0xe3, 0xdd, 0x6a, 0x07, 0xe9, 0xbb, 0x76, 0x06, 0xa4, 0x9c,
    0x33, 0x5c, 0x84, 0xb9, 0x1c, 0x0a, 0x2c, 0xa4, 0xa4, 0x66, 0xd3, 0xba, 0x5e, 0xf0, 0x5c, 0xd5,
];

// ── Mock drip_stream contract ─────────────────────────────────────────────────
// Returns a StreamRecord shaped identically to the real drip_stream contract so
// we can exercise the cross-contract payer check in `register_commitment`.

#[contract]
pub struct MockStream;

#[contractimpl]
impl MockStream {
    pub fn seed(env: Env, stream_id: u64, payer: Address, receiver: Address, token: Address) {
        let rec = StreamRecord {
            stream_id,
            token,
            payer,
            receiver,
            amount: 5000,
            withdrawn: 0,
            start_time: 0,
            end_time: 1000,
            status: StreamStatus::Active,
            created_at: 0,
            updated_at: 0,
            pause_started_at: 0,
            total_paused_secs: 0,
        };
        env.storage().persistent().set(&stream_id, &rec);
    }

    pub fn get_stream(env: Env, stream_id: u64) -> StreamRecord {
        env.storage().persistent().get(&stream_id).unwrap()
    }
}

// ── Test harness ───────────────────────────────────────────────────────────────

struct Harness {
    env: Env,
    client: DripZkVerifierClient<'static>,
    mock_stream: Address,
    admin: Address,
}

fn setup() -> Harness {
    let env = Env::default();
    env.mock_all_auths();

    let mock_stream = env.register(MockStream, ());

    let cid = env.register(DripZkVerifier, ());
    let client = DripZkVerifierClient::new(&env, &cid);

    let admin = Address::generate(&env);
    let vk = Bytes::from_slice(&env, VK);
    client.initialize(&admin, &mock_stream, &vk);

    Harness {
        env,
        client,
        mock_stream,
        admin,
    }
}

// ── initialize ─────────────────────────────────────────────────────────────────

#[test]
fn test_initialize_stores_admin_and_vk() {
    let h = setup();
    assert_eq!(h.client.get_admin(), h.admin);
    assert_eq!(h.client.vk_bytes().len() as usize, VK.len());
}

#[test]
fn test_double_initialize_fails() {
    let h = setup();
    let vk = Bytes::from_slice(&h.env, VK);
    let res = h
        .client
        .try_initialize(&Address::generate(&h.env), &h.mock_stream, &vk);
    assert_eq!(res, Err(Ok(Error::AlreadyInitialized)));
}

#[test]
fn test_initialize_rejects_bad_vk() {
    let env = Env::default();
    env.mock_all_auths();
    let mock_stream = env.register(MockStream, ());
    let cid = env.register(DripZkVerifier, ());
    let client = DripZkVerifierClient::new(&env, &cid);
    let bad_vk = Bytes::from_slice(&env, &[0u8; 10]);
    let res = client.try_initialize(&Address::generate(&env), &mock_stream, &bad_vk);
    assert_eq!(res, Err(Ok(Error::VkInvalidLength)));
}

// ── register_commitment ────────────────────────────────────────────────────────

#[test]
fn test_register_and_get_commitment() {
    let h = setup();
    let payer = Address::generate(&h.env);
    let receiver = Address::generate(&h.env);
    let token = Address::generate(&h.env);
    let mock = MockStreamClient::new(&h.env, &h.mock_stream);
    mock.seed(&1, &payer, &receiver, &token);

    let commitment = BytesN::from_array(&h.env, &COMMITMENT);
    h.client.register_commitment(&payer, &1, &commitment);

    assert_eq!(h.client.get_commitment(&1), commitment);
    assert!(h.client.has_commitment(&1));
    assert!(!h.client.has_commitment(&2));
}

#[test]
fn test_register_commitment_wrong_payer_fails() {
    let h = setup();
    let payer = Address::generate(&h.env);
    let receiver = Address::generate(&h.env);
    let token = Address::generate(&h.env);
    let mock = MockStreamClient::new(&h.env, &h.mock_stream);
    mock.seed(&1, &payer, &receiver, &token);

    let attacker = Address::generate(&h.env);
    let commitment = BytesN::from_array(&h.env, &COMMITMENT);
    let res = h.client.try_register_commitment(&attacker, &1, &commitment);
    assert_eq!(res, Err(Ok(Error::NotStreamPayer)));
}

// ── verify_income_proof ────────────────────────────────────────────────────────

#[test]
fn test_verify_income_proof_valid() {
    let h = setup();
    let payer = Address::generate(&h.env);
    let receiver = Address::generate(&h.env);
    let token = Address::generate(&h.env);
    let mock = MockStreamClient::new(&h.env, &h.mock_stream);
    mock.seed(&7, &payer, &receiver, &token);

    let commitment = BytesN::from_array(&h.env, &COMMITMENT);
    h.client.register_commitment(&payer, &7, &commitment);

    let proof = Bytes::from_slice(&h.env, PROOF);
    // The proof attests amount(=5000) >= 1000.
    let ok = h.client.verify_income_proof(&7, &1000_i128, &proof);
    assert!(ok, "valid proof for threshold 1000 should verify");
}

#[test]
fn test_verify_income_proof_wrong_threshold() {
    // The proof's public input fixes threshold = 1000. Asking the verifier to
    // check a different threshold changes the public inputs, so verification
    // must fail (the proof does not attest to threshold 1001).
    let h = setup();
    let payer = Address::generate(&h.env);
    let receiver = Address::generate(&h.env);
    let token = Address::generate(&h.env);
    let mock = MockStreamClient::new(&h.env, &h.mock_stream);
    mock.seed(&7, &payer, &receiver, &token);

    let commitment = BytesN::from_array(&h.env, &COMMITMENT);
    h.client.register_commitment(&payer, &7, &commitment);

    let proof = Bytes::from_slice(&h.env, PROOF);
    let ok = h.client.verify_income_proof(&7, &1001_i128, &proof);
    assert!(!ok, "threshold mismatch must not verify");
}

#[test]
fn test_verify_income_proof_wrong_commitment() {
    // Register a commitment that does not match the proof's public input.
    let h = setup();
    let payer = Address::generate(&h.env);
    let receiver = Address::generate(&h.env);
    let token = Address::generate(&h.env);
    let mock = MockStreamClient::new(&h.env, &h.mock_stream);
    mock.seed(&7, &payer, &receiver, &token);

    let mut bad = COMMITMENT;
    bad[31] ^= 0x01;
    let commitment = BytesN::from_array(&h.env, &bad);
    h.client.register_commitment(&payer, &7, &commitment);

    let proof = Bytes::from_slice(&h.env, PROOF);
    let ok = h.client.verify_income_proof(&7, &1000_i128, &proof);
    assert!(!ok, "wrong commitment must not verify");
}

#[test]
fn test_verify_missing_commitment_errors() {
    let h = setup();
    let proof = Bytes::from_slice(&h.env, PROOF);
    let res = h.client.try_verify_income_proof(&99, &1000_i128, &proof);
    assert_eq!(res, Err(Ok(Error::CommitmentNotFound)));
}

#[test]
fn test_verify_wrong_proof_length_errors() {
    let h = setup();
    let payer = Address::generate(&h.env);
    let receiver = Address::generate(&h.env);
    let token = Address::generate(&h.env);
    let mock = MockStreamClient::new(&h.env, &h.mock_stream);
    mock.seed(&7, &payer, &receiver, &token);
    let commitment = BytesN::from_array(&h.env, &COMMITMENT);
    h.client.register_commitment(&payer, &7, &commitment);

    let short_proof = Bytes::from_slice(&h.env, &PROOF[..100]);
    let res = h.client.try_verify_income_proof(&7, &1000_i128, &short_proof);
    assert_eq!(res, Err(Ok(Error::ProofWrongLength)));
}

#[test]
fn test_verify_negative_threshold_errors() {
    let h = setup();
    let payer = Address::generate(&h.env);
    let receiver = Address::generate(&h.env);
    let token = Address::generate(&h.env);
    let mock = MockStreamClient::new(&h.env, &h.mock_stream);
    mock.seed(&7, &payer, &receiver, &token);
    let commitment = BytesN::from_array(&h.env, &COMMITMENT);
    h.client.register_commitment(&payer, &7, &commitment);

    let proof = Bytes::from_slice(&h.env, PROOF);
    let res = h.client.try_verify_income_proof(&7, &-1_i128, &proof);
    assert_eq!(res, Err(Ok(Error::InvalidThreshold)));
}
