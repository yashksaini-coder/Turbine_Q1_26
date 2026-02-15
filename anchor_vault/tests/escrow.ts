import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Escrow } from "../target/types/escrow";
import { expect } from "chai";
import { Keypair } from "@solana/web3.js";

describe("escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Escrow as Program<Escrow>;
  const maker = provider.wallet.publicKey;
  const taker = Keypair.generate();

  const escrowAmount = new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL);

  let escrowStatePda: anchor.web3.PublicKey;
  let escrowVaultPda: anchor.web3.PublicKey;

  before(async () => {
    [escrowStatePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), maker.toBuffer()],
      program.programId
    );
    [escrowVaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow_vault"), escrowStatePda.toBuffer()],
      program.programId
    );
    await provider.connection.requestAirdrop(
      maker,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      taker.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await new Promise((r) => setTimeout(r, 1000));
  });

  describe("make", () => {
    it("creates an escrow with the given amount and taker", async () => {
      const makerBalanceBefore = await provider.connection.getBalance(maker);

      await program.methods
        .make(escrowAmount, taker.publicKey)
        .accountsStrict({
          maker,
          escrowState: escrowStatePda,
          escrowVault: escrowVaultPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      const state = await program.account.escrowState.fetch(escrowStatePda);
      expect(state.maker.equals(maker)).to.be.true;
      expect(state.taker.equals(taker.publicKey)).to.be.true;
      expect(state.amount.eq(escrowAmount)).to.be.true;

      const vaultBalance = await provider.connection.getBalance(escrowVaultPda);
      expect(vaultBalance).to.equal(escrowAmount.toNumber());

      const makerBalanceAfter = await provider.connection.getBalance(maker);
      expect(makerBalanceAfter).to.be.lt(makerBalanceBefore);
    });

    it("fails when amount is zero", async () => {
      const [zeroEscrowStatePda] =
        anchor.web3.PublicKey.findProgramAddressSync(
          [Buffer.from("escrow"), taker.publicKey.toBuffer()],
          program.programId
        );
      const [zeroEscrowVaultPda] =
        anchor.web3.PublicKey.findProgramAddressSync(
          [Buffer.from("escrow_vault"), zeroEscrowStatePda.toBuffer()],
          program.programId
        );

      try {
        await program.methods
          .make(new anchor.BN(0), maker)
          .accountsStrict({
            maker: taker.publicKey,
            escrowState: zeroEscrowStatePda,
            escrowVault: zeroEscrowVaultPda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([taker])
          .rpc();
        expect.fail("expected make(0) to throw");
      } catch {
        // expected: amount must be > 0
      }
    });
  });

  describe("take", () => {
    it("allows the taker to receive escrowed lamports", async () => {
      const takerBalanceBefore = await provider.connection.getBalance(
        taker.publicKey
      );
      const vaultBalanceBefore = await provider.connection.getBalance(
        escrowVaultPda
      );

      await program.methods
        .take()
        .accountsStrict({
          taker: taker.publicKey,
          escrowVault: escrowVaultPda,
          escrowState: escrowStatePda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([taker])
        .rpc();

      const takerBalanceAfter = await provider.connection.getBalance(
        taker.publicKey
      );
      const vaultBalanceAfter = await provider.connection.getBalance(
        escrowVaultPda
      );

      expect(vaultBalanceAfter).to.equal(0);
      expect(takerBalanceAfter).to.be.at.least(
        takerBalanceBefore + vaultBalanceBefore - 10000
      );
    });

    it("fails when called by non-taker", async () => {
      const other = Keypair.generate();
      await provider.connection.requestAirdrop(
        other.publicKey,
        anchor.web3.LAMPORTS_PER_SOL
      );
      await new Promise((r) => setTimeout(r, 500));

      const [otherEscrowStatePda] =
        anchor.web3.PublicKey.findProgramAddressSync(
          [Buffer.from("escrow"), other.publicKey.toBuffer()],
          program.programId
        );
      const [otherEscrowVaultPda] =
        anchor.web3.PublicKey.findProgramAddressSync(
          [Buffer.from("escrow_vault"), otherEscrowStatePda.toBuffer()],
          program.programId
        );

      await program.methods
        .make(new anchor.BN(1e6), taker.publicKey)
        .accountsStrict({
          maker: other.publicKey,
          escrowState: otherEscrowStatePda,
          escrowVault: otherEscrowVaultPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([other])
        .rpc();

      try {
        await program.methods
          .take()
          .accountsStrict({
            taker: maker,
            escrowVault: otherEscrowVaultPda,
            escrowState: otherEscrowStatePda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();
        expect.fail("expected take() by non-taker to throw");
      } catch {
        // expected: only taker can take
      }
    });
  });

  describe("refund", () => {
    let refundMaker: Keypair;
    let refundEscrowStatePda: anchor.web3.PublicKey;
    let refundEscrowVaultPda: anchor.web3.PublicKey;

    before(async () => {
      refundMaker = Keypair.generate();
      await provider.connection.requestAirdrop(
        refundMaker.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await new Promise((r) => setTimeout(r, 500));

      [refundEscrowStatePda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), refundMaker.publicKey.toBuffer()],
        program.programId
      );
      [refundEscrowVaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("escrow_vault"), refundEscrowStatePda.toBuffer()],
        program.programId
      );

      await program.methods
        .make(new anchor.BN(5e8), taker.publicKey)
        .accountsStrict({
          maker: refundMaker.publicKey,
          escrowState: refundEscrowStatePda,
          escrowVault: refundEscrowVaultPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([refundMaker])
        .rpc();
    });

    it("allows the maker to refund escrowed lamports", async () => {
      const makerBalanceBefore = await provider.connection.getBalance(
        refundMaker.publicKey
      );
      const vaultBalance = await provider.connection.getBalance(
        refundEscrowVaultPda
      );

      await program.methods
        .refund()
        .accountsStrict({
          maker: refundMaker.publicKey,
          escrowVault: refundEscrowVaultPda,
          escrowState: refundEscrowStatePda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([refundMaker])
        .rpc();

      const makerBalanceAfter = await provider.connection.getBalance(
        refundMaker.publicKey
      );
      const vaultBalanceAfter = await provider.connection.getBalance(
        refundEscrowVaultPda
      );

      expect(vaultBalanceAfter).to.equal(0);
      expect(makerBalanceAfter).to.be.at.least(
        makerBalanceBefore + vaultBalance - 10000
      );
    });

    it("fails when called by non-maker", async () => {
      const otherMaker = Keypair.generate();
      await provider.connection.requestAirdrop(
        otherMaker.publicKey,
        anchor.web3.LAMPORTS_PER_SOL
      );
      await new Promise((r) => setTimeout(r, 500));

      const [otherStatePda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), otherMaker.publicKey.toBuffer()],
        program.programId
      );
      const [otherVaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("escrow_vault"), otherStatePda.toBuffer()],
        program.programId
      );

      await program.methods
        .make(new anchor.BN(1e6), taker.publicKey)
        .accountsStrict({
          maker: otherMaker.publicKey,
          escrowState: otherStatePda,
          escrowVault: otherVaultPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([otherMaker])
        .rpc();

      try {
        await program.methods
          .refund()
          .accountsStrict({
            maker: taker.publicKey,
            escrowVault: otherVaultPda,
            escrowState: otherStatePda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([taker])
          .rpc();
        expect.fail("expected refund() by non-maker to throw");
      } catch {
        // expected: only maker can refund
      }
    });
  });
});
