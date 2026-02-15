use anchor_lang::{
    prelude::*,
    system_program::{transfer, Transfer},
};

pub mod error;
use error::*;

declare_id!("3zLC7pRWazRVahNo9q5amhGsNh5XLEHtLaCHa9n5xmu2");

#[program]
pub mod escrow {
    use super::*;

    /// Maker creates an escrow by depositing `amount` lamports.
    /// The escrow can later be taken by `taker` or refunded by the maker.
    pub fn make(ctx: Context<Make>, amount: u64, taker: Pubkey) -> Result<()> {
        require!(amount > 0, EscrowError::InvalidAmount);

        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.maker.to_account_info(),
                    to: ctx.accounts.escrow_vault.to_account_info(),
                },
            ),
            amount,
        )?;

        ctx.accounts.escrow_state.set_inner(EscrowState {
            maker: ctx.accounts.maker.key(),
            taker,
            amount,
            vault_bump: ctx.bumps.escrow_vault,
            state_bump: ctx.bumps.escrow_state,
        });
        Ok(())
    }

    /// Taker receives the escrowed lamports. Only the designated taker can call this.
    pub fn take(ctx: Context<Take>) -> Result<()> {
        require!(
            ctx.accounts.taker.key() == ctx.accounts.escrow_state.taker,
            EscrowError::UnauthorizedTaker
        );

        let balance = ctx.accounts.escrow_vault.lamports();
        require!(balance > 0, EscrowError::EscrowEmpty);

        let state_key = ctx.accounts.escrow_state.key();
        let seeds: &[&[&[u8]]] = &[&[
            b"escrow_vault",
            state_key.as_ref(),
            &[ctx.accounts.escrow_state.vault_bump],
        ]];

        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_vault.to_account_info(),
                    to: ctx.accounts.taker.to_account_info(),
                },
                seeds,
            ),
            balance,
        )?;

        Ok(())
    }

    /// Maker recovers the escrowed lamports. Only the maker can call this.
    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        require!(
            ctx.accounts.maker.key() == ctx.accounts.escrow_state.maker,
            EscrowError::UnauthorizedRefund
        );

        let balance = ctx.accounts.escrow_vault.lamports();
        require!(balance > 0, EscrowError::EscrowEmpty);

        let state_key = ctx.accounts.escrow_state.key();
        let seeds: &[&[&[u8]]] = &[&[
            b"escrow_vault",
            state_key.as_ref(),
            &[ctx.accounts.escrow_state.vault_bump],
        ]];

        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_vault.to_account_info(),
                    to: ctx.accounts.maker.to_account_info(),
                },
                seeds,
            ),
            balance,
        )?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Make<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,

    #[account(
        init,
        payer = maker,
        seeds = [b"escrow", maker.key().as_ref()],
        bump,
        space = 8 + EscrowState::INIT_SPACE,
    )]
    pub escrow_state: Account<'info, EscrowState>,

    #[account(
        mut,
        seeds = [b"escrow_vault", escrow_state.key().as_ref()],
        bump,
    )]
    pub escrow_vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Take<'info> {
    #[account(mut)]
    pub taker: Signer<'info>,

    #[account(
        mut,
        seeds = [b"escrow_vault", escrow_state.key().as_ref()],
        bump = escrow_state.vault_bump,
    )]
    pub escrow_vault: SystemAccount<'info>,

    #[account(
        seeds = [b"escrow", escrow_state.maker.as_ref()],
        bump = escrow_state.state_bump,
    )]
    pub escrow_state: Account<'info, EscrowState>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Refund<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,

    #[account(
        mut,
        seeds = [b"escrow_vault", escrow_state.key().as_ref()],
        bump = escrow_state.vault_bump,
    )]
    pub escrow_vault: SystemAccount<'info>,

    #[account(
        seeds = [b"escrow", escrow_state.maker.as_ref()],
        bump = escrow_state.state_bump,
    )]
    pub escrow_state: Account<'info, EscrowState>,

    pub system_program: Program<'info, System>,
}

#[derive(InitSpace)]
#[account]
pub struct EscrowState {
    pub maker: Pubkey,
    pub taker: Pubkey,
    pub amount: u64,
    pub vault_bump: u8,
    pub state_bump: u8,
}
