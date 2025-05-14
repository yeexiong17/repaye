use anchor_lang::prelude::*;

declare_id!("9MGNGbBKQqxDhVkRxuH5qDyovnpUw1FviYEUNcN7WUD");

#[program]
pub mod restaurant_booking {
    use super::*;

    pub fn initialize_user_stats(ctx: Context<InitializeUserStats>) -> Result<()> {
        let stats = &mut ctx.accounts.user_stats;
        stats.user = ctx.accounts.user.key();
        stats.restaurant = ctx.accounts.restaurant.key();
        stats.visit_count = 0;
        Ok(())
    }

    pub fn initialize_dish_stats(ctx: Context<InitializeDishStats>, name: String) -> Result<()> {
        let stats = &mut ctx.accounts.dish_stats;
        stats.user = ctx.accounts.user.key();
        stats.dish = ctx.accounts.dish.key();
        stats.count = 0;

        // Copy name bytes to the fixed buffer
        let name_bytes = name.as_bytes();
        let name_len = std::cmp::min(name_bytes.len(), 50);
        stats.name_len = name_len as u32;
        stats.name_data = [0u8; 50]; // Initialize with zeros
        stats.name_data[..name_len].copy_from_slice(&name_bytes[..name_len]);

        Ok(())
    }

    pub fn book_table(ctx: Context<BookTable>, _dish_ids: Vec<Pubkey>) -> Result<()> {
        let user_stats = &mut ctx.accounts.user_stats;
        user_stats.visit_count += 1;

        for i in (0..ctx.remaining_accounts.len()).step_by(2) {
            if i >= ctx.remaining_accounts.len() {
                continue;
            }

            let dish_stats_info = &ctx.remaining_accounts[i];

            // First get a read-only reference to deserialize
            let account_data = dish_stats_info.try_borrow_data()?;
            let mut dish_stats = DishStats::try_deserialize(&mut &account_data[..])?;

            // Update the count in our local copy
            dish_stats.count += 1;

            // Drop the read-only reference
            drop(account_data);

            // Now get a mutable reference to write back
            let mut account_data_mut = dish_stats_info.try_borrow_mut_data()?;

            // Write the data back
            let mut writer = std::io::Cursor::new(&mut account_data_mut[..]);
            dish_stats.try_serialize(&mut writer)?;
        }

        Ok(())
    }

    pub fn submit_review(ctx: Context<SubmitReview>, rating: u8, review: String, confidence_level: u8) -> Result<()> {
        require!(rating >= 1 && rating <= 5, ErrorCode::InvalidRating);
        require!(confidence_level >= 1 && confidence_level <= 10, ErrorCode::InvalidConfidenceLevel);

        let review_account = &mut ctx.accounts.review;

        // Only allow review if not already written
        if review_account.review_len > 0 {
            return Err(ErrorCode::ReviewAlreadyExists.into());
        }

        review_account.user = ctx.accounts.user.key();
        review_account.restaurant = ctx.accounts.restaurant.key();
        review_account.rating = rating;
        review_account.confidence_level = confidence_level;

        let review_bytes = review.as_bytes();
        let len = std::cmp::min(review_bytes.len(), 200);
        review_account.review_len = len as u32;
        review_account.review_data = [0u8; 200];
        review_account.review_data[..len].copy_from_slice(&review_bytes[..len]);

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeUserStats<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 32 + 8, // 8 (discriminator) + 32 (pubkey) + 32 (pubkey) + 8 (u64)
        seeds = [b"user-stats", user.key().as_ref(), restaurant.key().as_ref()],
        bump
    )]
    pub user_stats: Account<'info, UserStats>,
    /// CHECK: Only used as key
    pub restaurant: AccountInfo<'info>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeDishStats<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 32 + 8 + 4 + 50, // 8 (discriminator) + 32 (pubkey) + 32 (pubkey) + 8 (u64) + 4 (name_len) + 50 (name_data)
        seeds = [b"dish-stats", user.key().as_ref(), dish.key().as_ref()],
        bump
    )]
    pub dish_stats: Account<'info, DishStats>,
    /// CHECK: Only used as key
    pub dish: AccountInfo<'info>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BookTable<'info> {
    #[account(
        mut,
        seeds = [b"user-stats", user.key().as_ref(), restaurant.key().as_ref()],
        bump
    )]
    pub user_stats: Account<'info, UserStats>,
    /// CHECK: Only used as key
    pub restaurant: AccountInfo<'info>,
    #[account(mut)]
    pub user: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(rating: u8, review: String, confidence_level: u8)]
pub struct SubmitReview<'info> {
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + 32 + 32 + 1 + 4 + 200 + 1, // Added 1 byte for confidence_level
        seeds = [b"review", user.key().as_ref(), restaurant.key().as_ref()],
        bump
    )]
    pub review: Account<'info, Review>,
    /// CHECK: Only used for PDA seed
    pub restaurant: AccountInfo<'info>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct UserStats {
    pub user: Pubkey,
    pub restaurant: Pubkey,
    pub visit_count: u64,
}

#[account]
pub struct DishStats {
    pub user: Pubkey,
    pub dish: Pubkey,
    pub count: u64,
    pub name_len: u32,
    pub name_data: [u8; 50],
}

#[account]
pub struct Review {
    pub user: Pubkey,
    pub restaurant: Pubkey,
    pub rating: u8,             // 1-5
    pub review_len: u32,        // Length of review text
    pub review_data: [u8; 200], // Max 200 bytes for review text
    pub confidence_level: u8,   // 1-10, confidence in the review
}

#[error_code]
pub enum ErrorCode {
    #[msg("Rating must be between 1 and 5")]
    InvalidRating,
    #[msg("You have already submitted a review for this restaurant.")]
    ReviewAlreadyExists,
    #[msg("Confidence level must be between 1 and 10")]
    InvalidConfidenceLevel,
}
