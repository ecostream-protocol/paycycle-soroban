# Running PayCycle on Stellar testnet

1. Install the [Stellar CLI](https://developers.stellar.org/docs/tools/cli) and `rustup target add wasm32-unknown-unknown`.
2. Create funded identities:
   ```bash
   stellar keys generate admin  --network testnet --fund
   stellar keys generate keeper --network testnet --fund
   ```
3. Create a test USDC asset and get its contract id:
   ```bash
   stellar contract asset deploy --asset USDC:$(stellar keys address admin) --source admin --network testnet
   ```
4. Deploy and initialize: `ADMIN=admin ./scripts/deploy.sh` (prints `VITE_CONTRACT_ID`).
5. Copy `web/.env.example` to `web/.env` and set `VITE_CONTRACT_ID` and `VITE_TOKEN_ID` (the USDC contract id from step 3).
6. Switch Freighter to Testnet, add a USDC trustline and test USDC to your wallet, then `npm run dev`.
7. Run a keeper so due payments are collected:
   ```bash
   CONTRACT_ID=C... KEEPER_SECRET=$(stellar keys show keeper) npm run keeper
   ```
