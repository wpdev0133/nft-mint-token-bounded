use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, TokenAccount, Transfer, Token};
use std::str::FromStr;

// Constants
const MINT_PASS_COLLECTION: &[Pubkey] = &[
    Pubkey::from_str("4k3Dyjzvzp8eWcZQyQ8GqFfUzwg8o3Ts1Xx8NyWsfU3Y").unwrap(),
    Pubkey::from_str("5uSP3cCG3vBzEfp5pGbM1WxvS6aFHxpnnzzEYkC7ZRSS").unwrap(),
    Pubkey::from_str("8KjRFkRcYUSKNYbJBs3NZZp6w8kPZ1GVzWG5JPHntYaa").unwrap(),
    Pubkey::from_str("Cq1sKPzjgk9ZZmR48WxRujQnRztu6mkuCz3GneqcH9qB").unwrap(),
    Pubkey::from_str("9cXgR1LuKG76vMCbtDg1hufd9fKWsK544yFnDBH3fxWq").unwrap(),
    Pubkey::from_str("2Y52hkgnn4UQZWy1pCEoYgSoimvoaTy5gAAzAvZRfLfa").unwrap(),
];

const BASE_REWARD: u64 = 500_000; // Base reward for first mint
const LAMPORTS_PER_SOL: u64 = 1_000_000_000; // 1 SOL in lamports
const REWARD_DECREASE_RATE: u64 = 1_000; // Amount to decrease per mint

declare_id!("GP8qfaK2rnv3WvFf8z6zFUjMCsKUHFzqtnU4kDAB6xPS");

#[program]
pub mod mint_nft_with_rewards {
    use super::*;

    pub fn mint_nft(ctx: Context<MintNFT>, multiplier: u8) -> Result<()> {
        let has_mint_pass = MINT_PASS_COLLECTION.contains(&ctx.accounts.mint_pass.key());

        // Verify mint pass or SOL balance
        if !has_mint_pass && **ctx.accounts.payer.lamports.borrow() < LAMPORTS_PER_SOL {
            return Err(ErrorCode::NoMintPass.into());
        }

        // Collect SOL payment if no mint pass
        if !has_mint_pass {
            let ix = anchor_lang::solana_program::system_instruction::transfer(
                &ctx.accounts.payer.key(),
                &ctx.accounts.payment_vault.key(),
                LAMPORTS_PER_SOL,
            );
            anchor_lang::solana_program::program::invoke(
                &ix,
                &[
                    ctx.accounts.payer.to_account_info(),
                    ctx.accounts.payment_vault.to_account_info(),
                ],
            )?;
        }

        // Calculate token reward with bonding curve
        let current_supply = ctx.accounts.nft_mint_state.total_minted;
        let base_reward = BASE_REWARD.saturating_sub(current_supply * REWARD_DECREASE_RATE);
        let final_reward = (base_reward as u128)
            .checked_mul(multiplier as u128)
            .unwrap_or(0) as u64;

        // Create token vault for NFT
        let token_vault = &mut ctx.accounts.token_vault;
        token_vault.nft_mint = ctx.accounts.nft_mint.key();
        token_vault.token_amount = final_reward;
        token_vault.is_locked = true;
        token_vault.owner = ctx.accounts.payer.key();

        // Mint $CAPY tokens to the token vault
        let cpi_accounts = MintTo {
            mint: ctx.accounts.capy_token_mint.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.payer.to_account_info(),
        };

        token::mint_to(
            CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts),
            final_reward,
        )?;

        // Update mint state
        let mint_state = &mut ctx.accounts.nft_mint_state;
        mint_state.total_minted = mint_state.total_minted.checked_add(1).unwrap();

        Ok(())
    }

    pub fn unlock_tokens(ctx: Context<UnlockTokens>) -> Result<()> {
        let token_vault = &mut ctx.accounts.token_vault;
        
        // Verify owner
        require_keys_eq!(
            token_vault.owner,
            ctx.accounts.owner.key(),
            ErrorCode::UnauthorizedUnlock
        );

        // Verify tokens are locked
        require!(token_vault.is_locked, ErrorCode::TokensAlreadyUnlocked);

        // Transfer tokens from vault to recipient
        let cpi_accounts = Transfer {
            from: ctx.accounts.vault_token_account.to_account_info(),
            to: ctx.accounts.recipient_token_account.to_account_info(),
            authority: ctx.accounts.token_vault.to_account_info(),
        };

        token::transfer(
            CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts),
            token_vault.token_amount,
        )?;

        // Update vault state
        token_vault.is_locked = false;
        token_vault.token_amount = 0;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct MintNFT<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: Verified in program logic
    pub mint_pass: UncheckedAccount<'info>,
    /// CHECK: System program owned account for payment collection
    #[account(
        mut,
        seeds = [b"payment_vault"],
        bump
    )]
    pub payment_vault: UncheckedAccount<'info>,
    #[account(mut, signer)]
    pub nft_mint: Account<'info, Mint>,
    #[account(mut)]
    pub nft_token_account: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = payer,
        space = TokenVault::LEN,
        signer
    )]
    pub token_vault: Account<'info, TokenVault>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub capy_token_mint: Account<'info, Mint>,
    #[account(
        init_if_needed,
        payer = payer,
        space = MintState::LEN,
        seeds = [b"nft_mint_state"],
        bump
    )]
    pub nft_mint_state: Account<'info, MintState>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct UnlockTokens<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(mut)]
    pub token_vault: Account<'info, TokenVault>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub recipient_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct TokenVault {
    pub nft_mint: Pubkey,
    pub token_amount: u64,
    pub is_locked: bool,
    pub owner: Pubkey,
}

#[account]
pub struct MintState {
    pub total_minted: u64,
}

impl TokenVault {
    const LEN: usize = 8 + // discriminator
        32 + // nft_mint
        8 + // token_amount
        1 + // is_locked
        32; // owner
}

impl MintState {
    const LEN: usize = 8 + // discriminator
        8; // total_minted
}

#[error_code]
pub enum ErrorCode {
    #[msg("User does not have a mint pass and insufficient SOL balance")]
    NoMintPass,
    #[msg("Only the NFT owner can unlock tokens")]
    UnauthorizedUnlock,
    #[msg("Tokens are already unlocked")]
    TokensAlreadyUnlocked,
}