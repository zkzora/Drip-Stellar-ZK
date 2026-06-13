// Drip Private -- zero-knowledge income proof circuit.
//
// Proves two things to a verifier WITHOUT revealing the actual stream amount:
//   1. The prover knows (amount, salt) whose Pedersen hash equals a public
//      `commitment` that the payer registered on-chain.
//   2. amount >= threshold  (the receiver earns at least `threshold` per period).
//
// Private inputs : amount, salt        (hidden from the verifier)
// Public inputs  : commitment, threshold   (visible on-chain, order matters:
//                  the Soroban verifier expects public inputs [commitment, threshold])

fn main(
    // Private inputs (hidden from verifier)
    amount: Field,
    salt: Field,
    // Public inputs (visible on-chain)
    commitment: pub Field,
    threshold: pub Field,
) {
    // 1. Verify commitment: prover knows the preimage of `commitment`.
    let computed = std::hash::pedersen_hash([amount, salt]);
    assert(computed == commitment);

    // 2. Verify income threshold: amount >= threshold.
    //    Cast to u64 for a range-checked comparison; stroop amounts and
    //    thresholds comfortably fit in 64 bits (max XLM supply ~1e18 stroops).
    let amount_u64 = amount as u64;
    let threshold_u64 = threshold as u64;
    assert(amount_u64 >= threshold_u64);
}

#[test]
fn test_valid_proof() {
    // amount above threshold, commitment computed from the same preimage.
    let amount: Field = 5000;
    let salt: Field = 123456789;
    let commitment = std::hash::pedersen_hash([amount, salt]);
    main(amount, salt, commitment, 1000);
}

#[test(should_fail)]
fn test_below_threshold() {
    let amount: Field = 500;
    let salt: Field = 123456789;
    let commitment = std::hash::pedersen_hash([amount, salt]);
    main(amount, salt, commitment, 1000);
}

#[test(should_fail)]
fn test_wrong_commitment() {
    let amount: Field = 5000;
    let salt: Field = 123456789;
    // Deliberately wrong commitment.
    main(amount, salt, 42, 1000);
}
