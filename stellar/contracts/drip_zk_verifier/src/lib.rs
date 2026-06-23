//! Drip Private -- confidential income proof verifier (Stellar Soroban).
//!
//! This contract lets a stream *receiver* prove to a third party that they
//! receive at least `threshold` per period from a valid Drip stream WITHOUT
//! revealing the exact stream amount on-chain.
//!
//! Flow:
//!   1. Payer creates a normal stream in the `drip_stream` contract, then
//!      registers a Pedersen *commitment* to the amount here
//!      (`register_commitment`). The amount itself never touches this contract.
//!   2. The receiver generates a zero-knowledge UltraHonk proof in the browser
//!      (Noir circuit `drip_income_proof`) that:
//!        - they know `(amount, salt)` hashing to the registered commitment, and
//!        - `amount >= threshold`.
//!   3. Anyone can call `verify_income_proof` to check the proof on-chain. The
//!      public inputs are `[commitment, threshold]` -- the amount stays private.
//!
//! Proof verification uses the BN254 host functions (Protocol 23+) via the
//! vendored `ultrahonk_soroban_verifier` crate
//! (https://github.com/yugocabrio/rs-soroban-ultrahonk), which implements the
//! native, non-ZK, keccak-transcript UltraHonk path. Proofs and the
//! verification key must be produced with Noir 1.0.0-beta.9 + Barretenberg
//! 0.87.0 (`bb prove/write_vk --scheme ultra_honk --oracle_hash keccak`).

#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, vec, Address, Bytes, BytesN, Env,
    IntoVal, Symbol,
};
use ultrahonk_soroban_verifier::{UltraHonkVerifier, VkLoadError, PROOF_BYTES};

// ── TTL constants (mirror drip_stream) ─────────────────────────────────────────
const LEDGER_TTL_THRESHOLD: u32 = 100_000;
const LEDGER_TTL_BUMP: u32 = 518_400;

// ── Storage keys ───────────────────────────────────────────────────────────────

#[contracttype]
pub enum DataKey {
    Admin,
    /// The Drip stream contract used to authorise commitment registration.
    StreamContract,
    /// The UltraHonk verification key for the `drip_income_proof` circuit.
    Vk,
    /// stream_id -> commitment (BytesN<32>, a BN254 field element).
    Commitment(u64),
    /// Optional minimum remaining stream duration (seconds) required for a
    /// proof to verify. 0 / unset = disabled. See `set_min_remaining_duration`.
    MinRemainingSecs,
}

/// Recommended production value for `set_min_remaining_duration`: 30 days.
///
/// Deliberately NOT applied by default — the contract ships with the minimum
/// disabled (0) so existing fixtures and short prototype streams still verify.
/// Operators opt in by calling `set_min_remaining_duration`. Documented here so
/// the "raise the cost of self-dealing" knob has a sane reference value.
/// (30 days ≈ 2_592_000 s.)
pub const RECOMMENDED_MIN_REMAINING_SECS: u64 = 30 * 24 * 60 * 60;

// ── Errors ───────────────────────────────────────────────────────────────────--

#[contracterror]
#[repr(u32)]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    VkInvalidLength = 3,
    VkInvalidParameters = 4,
    /// Caller is not the payer of the referenced stream.
    NotStreamPayer = 5,
    /// No commitment registered for the given stream id.
    CommitmentNotFound = 6,
    /// Proof byte length does not match the expected UltraHonk proof size.
    ProofWrongLength = 7,
    /// Threshold must be non-negative.
    InvalidThreshold = 8,
}

// ── Mirror of drip_stream::Stream for cross-contract reads ─────────────────────
//
// Soroban serialises a `contracttype` struct as a map keyed by field *name*, so
// this mirror only needs matching field names and types to decode a `Stream`
// returned by the (separately deployed) `drip_stream` contract -- even though
// that contract is built against a different soroban-sdk version.

#[contracttype]
#[derive(Clone, PartialEq, Debug)]
pub enum StreamStatus {
    Active,
    Paused,
    Cancelled,
    Completed,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct StreamRecord {
    pub stream_id: u64,
    pub token: Address,
    pub payer: Address,
    pub receiver: Address,
    pub amount: i128,
    pub withdrawn: i128,
    pub start_time: u64,
    pub end_time: u64,
    pub status: StreamStatus,
    pub created_at: u64,
    pub updated_at: u64,
    pub pause_started_at: u64,
    pub total_paused_secs: u64,
}

// ── Contract ─────────────────────────────────────────────────────────────────--

#[contract]
pub struct DripZkVerifier;

#[contractimpl]
impl DripZkVerifier {
    /// One-time setup. Registers the admin, the `drip_stream` contract address
    /// (used to authorise commitment registration), and the UltraHonk
    /// verification key for the `drip_income_proof` circuit.
    ///
    /// The VK is validated by parsing it, so a malformed or empty VK is
    /// rejected at initialization time.
    pub fn initialize(
        env: Env,
        admin: Address,
        drip_stream: Address,
        vk: Bytes,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        // Validate the VK eagerly.
        UltraHonkVerifier::new(&env, &vk).map_err(map_vk_err)?;

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::StreamContract, &drip_stream);
        env.storage().instance().set(&DataKey::Vk, &vk);
        Ok(())
    }

    /// Register a commitment to a stream's amount. Only the stream's *payer*
    /// may do this -- enforced both by `require_auth` and by reading the stream
    /// record from the `drip_stream` contract.
    ///
    /// `commitment` is `pedersen_hash([amount, salt])` encoded as a 32-byte
    /// big-endian BN254 field element (the same value the circuit exposes as a
    /// public input).
    pub fn register_commitment(
        env: Env,
        caller: Address,
        stream_id: u64,
        commitment: BytesN<32>,
    ) -> Result<(), Error> {
        caller.require_auth();

        let drip_stream: Address = env
            .storage()
            .instance()
            .get(&DataKey::StreamContract)
            .ok_or(Error::NotInitialized)?;

        // Cross-contract read: fetch the stream and confirm `caller` is payer.
        let stream: StreamRecord = env.invoke_contract(
            &drip_stream,
            &Symbol::new(&env, "get_stream"),
            vec![&env, stream_id.into_val(&env)],
        );
        if stream.payer != caller {
            return Err(Error::NotStreamPayer);
        }

        env.storage()
            .persistent()
            .set(&DataKey::Commitment(stream_id), &commitment);
        env.storage().persistent().extend_ttl(
            &DataKey::Commitment(stream_id),
            LEDGER_TTL_THRESHOLD,
            LEDGER_TTL_BUMP,
        );
        Ok(())
    }

    /// Verify a confidential income proof for `stream_id`.
    ///
    /// Reconstructs the public inputs `[commitment, threshold]` from on-chain
    /// state (the commitment registered by the payer) and the caller-supplied
    /// `threshold`, then verifies the UltraHonk proof against the stored VK.
    ///
    /// Returns `true` iff BOTH hold:
    ///   1. the proof is valid — the prover knows the committed amount AND that
    ///      amount is `>= threshold` (the amount itself is never revealed), and
    ///   2. the stream is still *live* — see [`Self::is_stream_live`].
    ///
    /// Condition (2) is the liveness gate. A valid proof alone is a statement
    /// about a commitment, not about whether the stream still pays out today;
    /// without this check a receiver could prove income, draw a loan, then
    /// `cancel_stream` and keep re-presenting the stale-but-valid proof. By
    /// re-reading the live stream state on every verification we make a
    /// cancelled / expired / paused stream stop verifying.
    ///
    /// READ-ONLY: this function never writes contract state and submits no
    /// transactions — the liveness gate is a single cross-contract *read*. A
    /// lender can therefore keep running it for $0 via `simulateTransaction`,
    /// and "re-verify" is just calling it again.
    pub fn verify_income_proof(
        env: Env,
        stream_id: u64,
        threshold: i128,
        proof: Bytes,
    ) -> Result<bool, Error> {
        if threshold < 0 {
            return Err(Error::InvalidThreshold);
        }
        if proof.len() as usize != PROOF_BYTES {
            return Err(Error::ProofWrongLength);
        }

        let commitment: BytesN<32> = env
            .storage()
            .persistent()
            .get(&DataKey::Commitment(stream_id))
            .ok_or(Error::CommitmentNotFound)?;

        // Liveness gate. Done before the (more expensive) proof verification:
        // a dead stream can never verify regardless of proof validity. Returns
        // `Ok(false)` — same shape a lender already handles for "not verified"
        // — rather than an error, so the read stays simple to consume.
        if !Self::is_stream_live(&env, stream_id) {
            return Ok(false);
        }

        let vk: Bytes = env
            .storage()
            .instance()
            .get(&DataKey::Vk)
            .ok_or(Error::NotInitialized)?;

        let public_inputs = build_public_inputs(&env, &commitment, threshold);

        let verifier = UltraHonkVerifier::new(&env, &vk).map_err(map_vk_err)?;
        Ok(verifier.verify(&env, &proof, &public_inputs).is_ok())
    }

    /// Configure the minimum remaining stream duration (in seconds) that
    /// `verify_income_proof` requires. `0` disables the check (the default).
    ///
    /// Setting e.g. [`RECOMMENDED_MIN_REMAINING_SECS`] (30 days) forces every
    /// income claim to be backed by a stream that still has real runway left,
    /// so a "spin up a stream, prove, immediately cancel" self-deal has to lock
    /// funds for a meaningful window instead of a single block. This is a
    /// purely economic knob enforced in contract logic — the ZK circuit is
    /// untouched. Admin-only.
    pub fn set_min_remaining_duration(env: Env, secs: u64) -> Result<(), Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();
        env.storage()
            .instance()
            .set(&DataKey::MinRemainingSecs, &secs);
        Ok(())
    }

    /// Read the configured minimum remaining duration (seconds). 0 = disabled.
    pub fn min_remaining_duration(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::MinRemainingSecs)
            .unwrap_or(0)
    }

    /// Read the commitment registered for a stream.
    pub fn get_commitment(env: Env, stream_id: u64) -> Result<BytesN<32>, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Commitment(stream_id))
            .ok_or(Error::CommitmentNotFound)
    }

    /// Returns true if a commitment is registered for the stream (UI badge).
    pub fn has_commitment(env: Env, stream_id: u64) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::Commitment(stream_id))
    }

    /// Return the current admin.
    pub fn get_admin(env: Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)
    }

    /// Return the stored verification key bytes (for auditability).
    pub fn vk_bytes(env: Env) -> Result<Bytes, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Vk)
            .ok_or(Error::NotInitialized)
    }
}

// ── Internal helpers ───────────────────────────────────────────────────────────

impl DripZkVerifier {
    /// Read the live stream record from `drip_stream` and decide whether it
    /// still backs an income claim *right now*. One read-only cross-contract
    /// `get_stream` call; no extra cryptography, writes nothing.
    ///
    /// Liveness policy (explicit — mirrored in README "Proof Validity &
    /// Self-Dealing"):
    ///   • `Active`                  → live.
    ///   • `Paused`                  → NOT live. A paused stream is not vesting,
    ///                                 so the income is not currently flowing;
    ///                                 we deliberately reject rather than treat
    ///                                 "temporarily stopped" as "earning".
    ///   • `Cancelled` / `Completed` → NOT live.
    ///   • Past `end_time`           → NOT live (expired). `end_time == 0` is
    ///                                 the stream contract's "no fixed end"
    ///                                 sentinel (funds vest immediately, never
    ///                                 expire) and counts as live.
    ///   • Below configured minimum remaining duration → NOT live (opt-in,
    ///     default disabled; see `set_min_remaining_duration`).
    fn is_stream_live(env: &Env, stream_id: u64) -> bool {
        let drip_stream: Address = match env.storage().instance().get(&DataKey::StreamContract) {
            Some(addr) => addr,
            None => return false,
        };

        // Cross-contract read of the canonical stream state.
        let stream: StreamRecord = env.invoke_contract(
            &drip_stream,
            &Symbol::new(env, "get_stream"),
            vec![env, stream_id.into_val(env)],
        );

        // Only an actively-streaming position counts. Paused is intentionally
        // rejected (see policy above).
        if stream.status != StreamStatus::Active {
            return false;
        }

        let now = env.ledger().timestamp();

        // Expiry: only meaningful when an end_time is set (0 == perpetual).
        if stream.end_time != 0 && stream.end_time <= now {
            return false;
        }

        // Optional minimum-remaining-duration gate (opt-in). Perpetual streams
        // (end_time == 0) have unbounded runway and always satisfy it.
        let min_remaining: u64 = env
            .storage()
            .instance()
            .get(&DataKey::MinRemainingSecs)
            .unwrap_or(0);
        if min_remaining > 0 && stream.end_time != 0 {
            let remaining = stream.end_time.saturating_sub(now);
            if remaining < min_remaining {
                return false;
            }
        }

        true
    }
}

fn map_vk_err(e: VkLoadError) -> Error {
    match e {
        VkLoadError::WrongLength => Error::VkInvalidLength,
        VkLoadError::InvalidParameters => Error::VkInvalidParameters,
    }
}

/// Build the 64-byte public-input blob `[commitment(32) || threshold(32)]`.
///
/// `threshold` is encoded as a big-endian 32-byte BN254 field element. Because
/// a valid threshold is a non-negative `i128`, the high 16 bytes are zero and
/// the low 16 bytes hold the big-endian value -- matching what the Noir circuit
/// exposes for its `threshold: pub Field` input.
fn build_public_inputs(env: &Env, commitment: &BytesN<32>, threshold: i128) -> Bytes {
    let mut pi = Bytes::new(env);
    pi.append(&Bytes::from_array(env, &commitment.to_array()));

    let mut threshold_word = [0u8; 32];
    threshold_word[16..32].copy_from_slice(&threshold.to_be_bytes());
    pi.append(&Bytes::from_array(env, &threshold_word));
    pi
}

#[cfg(test)]
mod test;
