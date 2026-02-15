use anchor_lang::prelude::*;

#[error_code]
pub enum EscrowError {
    #[msg("The amount must be greater than zero.")]
    InvalidAmount,
    #[msg("Only the designated taker can take the escrow.")]
    UnauthorizedTaker,
    #[msg("Only the maker can refund the escrow.")]
    UnauthorizedRefund,
    #[msg("Escrow vault is empty.")]
    EscrowEmpty,
}
