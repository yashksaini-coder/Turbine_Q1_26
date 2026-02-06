use anchor_lang::prelude::*;

#[error_code]
pub enum VaultError {
    #[msg("The amount you requested is not valid.")]
    InvalidAmount,
    #[msg("The vault is empty.")]
    VaultEmpty,
    #[msg("The requested Withdrawal amount exceeds the vault balance.")]
    InsufficientFunds,
}
