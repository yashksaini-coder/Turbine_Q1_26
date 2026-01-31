// Created this mint address: 3F3xMmRu6dVz5cibkXMtUnoPXYuSHWAt28fHMuhfm2nU
// Created ata is: 9ce1UTnS3DzCGRLkDPf1frfR31AZqpufuhaWYMPV3SQp
// Created mint txid: 631RH1TDP2pJRSmA2EuLvAMoB3MsmXbG1yadVYorqFNvfxBioq6HjSg9zRhUM8poxZsRrscZMGiygZLRpXZVV2Hd
// Created transaction ID: 54sohMLUyUHrz4NTxLpgvz2jUDgPXzvebPUTubhLTqoZXjvYxJgC9Kwkt56hPnBprUUB8BYtMQKNA88yYymwH4jv


import { Keypair, Connection, Commitment } from "@solana/web3.js";
import { createMint } from '@solana/spl-token';
import wallet from "./wallet/turbin3-wallet.json"

// Import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

//Create a Solana devnet connection
const commitment: Commitment = "confirmed";
const connection = new Connection("https://api.devnet.solana.com", commitment);

(async () => {
    try {
        // Start here
        const mint = await createMint(
            connection,
            keypair,
            keypair.publicKey,
            null,
            6
        );
        console.log(`Mint created: ${mint.toBase58()}`);
    } catch(error) {
        console.log(`Oops, something went wrong: ${error}`)
    }
})()
