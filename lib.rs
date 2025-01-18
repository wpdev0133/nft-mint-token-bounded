use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

declare_id!("6PE1No7QEVHVH8SgV5BbQCRL9EWs5VjvvaaUecN2LNNi");

#[program]
pub mod nft_minter {
    use super::*;

    pub fn mint_nft(ctx: Context<MintNFT>) -> Result<()> {
        // Transfer 1 SOL payment
        let payment_amount = 1_000_000_000; // 1 SOL in lamports

        // Transfer SOL from user to mint authority
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.user.to_account_info(),
                    to: ctx.accounts.mint_authority.to_account_info(),
                },
            ),
            payment_amount,
        )?;

        // Mint one token
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.token_account.to_account_info(),
                    authority: ctx.accounts.mint_authority.to_account_info(),
                },
                &[],
            ),
            1,
        )?;

        msg!("NFT minted successfully!");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct MintNFT<'info> {
    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = mint,
        associated_token::authority = user
    )]
    pub token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub mint_authority: Signer<'info>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
