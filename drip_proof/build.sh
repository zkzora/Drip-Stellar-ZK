#!/usr/bin/env bash
# Build the Drip Private income-proof circuit and generate the on-chain
# artifacts (verification key + a sample proof) consumed by the
# drip_zk_verifier Soroban contract and the frontend.
#
# Pins the exact toolchain the on-chain verifier was built against:
#   Noir 1.0.0-beta.9   +   Barretenberg 0.87.0   (keccak transcript, non-ZK)
#
# Usage:  ./build.sh
# Output (drip_proof/target/):
#   drip_income_proof.json   ACIR — imported by the frontend (Noir.js)
#   vk                       1760-byte verification key — pass to initialize()
#   proof                    14592-byte sample proof — used by contract tests
#   public_inputs            64 bytes = [commitment, threshold]

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

export PATH="$HOME/.nargo/bin:$HOME/.bb/bin:$PATH"

command -v nargo >/dev/null || { echo "nargo not found. Install: noirup -v 1.0.0-beta.9"; exit 1; }
command -v bb    >/dev/null || { echo "bb not found. Install: bbup -v 0.87.0"; exit 1; }

echo "• nargo compile"
nargo compile

echo "• nargo execute (witness from Prover.toml)"
nargo execute

JSON="target/drip_income_proof.json"
GZ="target/drip_income_proof.gz"

echo "• bb prove (ultra_honk, keccak)"
bb prove --scheme ultra_honk --oracle_hash keccak \
  --bytecode_path "$JSON" --witness_path "$GZ" \
  --output_path target --output_format bytes_and_fields

echo "• bb write_vk (ultra_honk, keccak)"
bb write_vk --scheme ultra_honk --oracle_hash keccak \
  --bytecode_path "$JSON" \
  --output_path target --output_format bytes_and_fields

echo
echo "Artifacts:"
printf '  %8s bytes  %s\n' "$(wc -c < target/vk)"            "target/vk            (verification key)"
printf '  %8s bytes  %s\n' "$(wc -c < target/proof)"         "target/proof         (sample proof)"
printf '  %8s bytes  %s\n' "$(wc -c < target/public_inputs)" "target/public_inputs ([commitment, threshold])"
echo
echo "Next: refresh the contract test fixtures if the circuit changed —"
echo "  cp target/{vk,proof,public_inputs} ../stellar/contracts/drip_zk_verifier/test_fixtures/"
