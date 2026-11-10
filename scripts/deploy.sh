#!/usr/bin/env bash
# Builds, deploys and initializes PayCycle on Stellar testnet.
# Requires the stellar CLI and: rustup target add wasm32-unknown-unknown
# Usage: ADMIN=admin ./scripts/deploy.sh
set -euo pipefail
: "${ADMIN:?Set ADMIN to a stellar CLI identity (stellar keys generate admin --network testnet --fund)}"
NETWORK="${NETWORK:-testnet}"
MIN_PERIOD="${MIN_PERIOD:-60}"

cd "$(dirname "$0")/../contracts"
stellar contract build
CONTRACT_ID=$(stellar contract deploy --wasm target/wasm32-unknown-unknown/release/paycycle.wasm --source "$ADMIN" --network "$NETWORK")
stellar contract invoke --id "$CONTRACT_ID" --source "$ADMIN" --network "$NETWORK" -- \
  initialize --admin "$(stellar keys address "$ADMIN")" --min_period "$MIN_PERIOD"

echo
echo "Deployed. Put this in web/.env and your keeper environment:"
echo "VITE_CONTRACT_ID=$CONTRACT_ID"
