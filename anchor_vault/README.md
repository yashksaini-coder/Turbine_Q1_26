# Anchor Vault Program

A simple Solana smart contract built with Anchor. It implements a basic vault where users can:

- Initialize a vault PDA (Program Derived Address) with a state account to store bumps.
- Deposit SOL into the vault.
- Withdraw SOL from the vault (signed by the PDA).
- Close the vault, transferring remaining SOL back to the user and closing the state account.

## Deploy to localnet

`anchor deploy --provider.cluster localnet` talks to a **local Solana validator** at `http://127.0.0.1:8899`. You must start that validator first.

**Terminal 1 — start the validator (leave it running):**

```bash
solana-test-validator
```

**Terminal 2 — point CLI at localhost and deploy:**

```bash
cd anchor_vault
solana config set --url http://127.0.0.1:8899
npm run deploy:local
# or: anchor deploy --provider.cluster localnet
```

Optional: airdrop SOL for fees: `solana airdrop 2`

## Prerequisites

- Anchor CLI (version 0.32.1 or later) installed via AVM.
- Surfpool CLI installed (for enhanced local testing and runbooks: `brew install surfpool` on macOS, or from source [surfpool](https://surfpool.run/)).
- Solana CLI tools.
- Node.js/Yarn for tests.
