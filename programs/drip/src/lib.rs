use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke_signed, system_instruction};

declare_id!("D5u3CiH3drPiQfiXctrFe6yDCsFsqHcWQ5aAnC9pkKM6");

#[program]
pub mod drip {
    use super::*;

    pub fn initialize_stream(
        ctx: Context<InitializeStream>,
        stream_id: u64,
        deposited_amount: u64,
        flow_rate_per_second: u64,
        max_budget: u64,
        expiration_time: i64,
    ) -> Result<()> {
        require!(deposited_amount > 0, DripError::InvalidDeposit);
        require!(flow_rate_per_second > 0, DripError::InvalidFlowRate);
        require_keys_neq!(
            ctx.accounts.payer.key(),
            ctx.accounts.receiver.key(),
            DripError::InvalidReceiver
        );
        require!(
            max_budget == 0 || max_budget <= deposited_amount,
            DripError::InvalidMaxBudget
        );

        let clock = Clock::get()?;
        let rent = Rent::get()?;
        let escrow_rent_reserve = rent.minimum_balance(0);
        let escrow_funding_amount = deposited_amount
            .checked_add(escrow_rent_reserve)
            .ok_or(DripError::MathError)?;
        require!(
            expiration_time == 0 || expiration_time > clock.unix_timestamp,
            DripError::InvalidExpiration
        );

        let stream_key = ctx.accounts.stream_state.key();
        let escrow_bump = ctx.bumps.escrow;
        let escrow_seeds: &[&[u8]] = &[b"escrow", stream_key.as_ref(), &[escrow_bump]];

        invoke_signed(
            &system_instruction::transfer(
                &ctx.accounts.payer.key(),
                &ctx.accounts.escrow.key(),
                escrow_funding_amount,
            ),
            &[
                ctx.accounts.payer.to_account_info(),
                ctx.accounts.escrow.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[escrow_seeds],
        )?;

        let stream = &mut ctx.accounts.stream_state;
        stream.payer = ctx.accounts.payer.key();
        stream.receiver = ctx.accounts.receiver.key();
        stream.stream_id = stream_id;
        stream.deposited_amount = deposited_amount;
        stream.withdrawn_amount = 0;
        stream.flow_rate_per_second = flow_rate_per_second;
        stream.start_time = clock.unix_timestamp;
        stream.last_withdraw_time = clock.unix_timestamp;
        stream.pause_started_at = 0;
        stream.total_paused_seconds = 0;
        stream.max_budget = max_budget;
        stream.expiration_time = expiration_time;
        stream.is_paused = false;
        stream.is_cancelled = false;
        stream.bump = ctx.bumps.stream_state;
        stream.escrow_bump = escrow_bump;

        emit!(StreamCreated {
            stream: stream.key(),
            payer: stream.payer,
            receiver: stream.receiver,
            deposited_amount,
            flow_rate_per_second,
            max_budget,
            expiration_time,
            start_time: stream.start_time,
        });

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        let clock = Clock::get()?;
        let stream = &mut ctx.accounts.stream_state;

        require!(!stream.is_cancelled, DripError::AlreadyCancelled);
        require!(!stream.is_paused, DripError::StreamPaused);
        require_keys_eq!(
            ctx.accounts.receiver.key(),
            stream.receiver,
            DripError::UnauthorizedReceiver
        );

        let unlocked = calculate_unlocked_amount(stream, clock.unix_timestamp)?;
        let withdrawable = unlocked
            .checked_sub(stream.withdrawn_amount)
            .ok_or(DripError::MathError)?;
        require!(withdrawable > 0, DripError::NothingToWithdraw);
        let available =
            escrow_lamports_available_for_stream(&ctx.accounts.escrow.to_account_info())?;
        require!(
            withdrawable <= available,
            DripError::InsufficientEscrowFunds
        );

        transfer_from_escrow(
            &ctx.accounts.escrow.to_account_info(),
            &ctx.accounts.receiver.to_account_info(),
            &ctx.accounts.system_program.to_account_info(),
            stream.key(),
            ctx.accounts.escrow.key(),
            stream.escrow_bump,
            withdrawable,
        )?;

        stream.withdrawn_amount = stream
            .withdrawn_amount
            .checked_add(withdrawable)
            .ok_or(DripError::MathError)?;
        stream.last_withdraw_time = clock.unix_timestamp;

        emit!(Withdrawn {
            stream: stream.key(),
            receiver: stream.receiver,
            amount: withdrawable,
            total_withdrawn: stream.withdrawn_amount,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn pause_stream(ctx: Context<PauseStream>) -> Result<()> {
        let clock = Clock::get()?;
        let stream = &mut ctx.accounts.stream_state;

        require!(!stream.is_cancelled, DripError::AlreadyCancelled);
        require!(!stream.is_paused, DripError::AlreadyPaused);
        require_keys_eq!(
            ctx.accounts.payer.key(),
            stream.payer,
            DripError::UnauthorizedPayer
        );

        stream.is_paused = true;
        stream.pause_started_at = clock.unix_timestamp;

        emit!(StreamPaused {
            stream: stream.key(),
            payer: stream.payer,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn resume_stream(ctx: Context<ResumeStream>) -> Result<()> {
        let clock = Clock::get()?;
        let stream = &mut ctx.accounts.stream_state;

        require!(!stream.is_cancelled, DripError::AlreadyCancelled);
        require!(stream.is_paused, DripError::NotPaused);
        require_keys_eq!(
            ctx.accounts.payer.key(),
            stream.payer,
            DripError::UnauthorizedPayer
        );

        let paused_duration = clock
            .unix_timestamp
            .checked_sub(stream.pause_started_at)
            .ok_or(DripError::MathError)?;
        stream.total_paused_seconds = stream
            .total_paused_seconds
            .checked_add(paused_duration)
            .ok_or(DripError::MathError)?;
        stream.pause_started_at = 0;
        stream.is_paused = false;

        emit!(StreamResumed {
            stream: stream.key(),
            payer: stream.payer,
            paused_duration,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn cancel_stream(ctx: Context<CancelStream>) -> Result<()> {
        let clock = Clock::get()?;
        let stream = &mut ctx.accounts.stream_state;

        require!(!stream.is_cancelled, DripError::AlreadyCancelled);
        require_keys_eq!(
            ctx.accounts.payer.key(),
            stream.payer,
            DripError::UnauthorizedPayer
        );
        require_keys_eq!(
            ctx.accounts.receiver.key(),
            stream.receiver,
            DripError::InvalidReceiver
        );

        let unlocked = calculate_unlocked_amount(stream, clock.unix_timestamp)?;
        let receiver_due = unlocked
            .checked_sub(stream.withdrawn_amount)
            .ok_or(DripError::MathError)?;
        let mut available =
            escrow_lamports_available_for_stream(&ctx.accounts.escrow.to_account_info())?;
        let receiver_payment = receiver_due.min(available);

        if receiver_payment > 0 {
            transfer_from_escrow(
                &ctx.accounts.escrow.to_account_info(),
                &ctx.accounts.receiver.to_account_info(),
                &ctx.accounts.system_program.to_account_info(),
                stream.key(),
                ctx.accounts.escrow.key(),
                stream.escrow_bump,
                receiver_payment,
            )?;
            stream.withdrawn_amount = stream
                .withdrawn_amount
                .checked_add(receiver_payment)
                .ok_or(DripError::MathError)?;
            available = available
                .checked_sub(receiver_payment)
                .ok_or(DripError::MathError)?;
        }

        let remaining_unpaid_stream_funds = stream
            .deposited_amount
            .checked_sub(stream.withdrawn_amount)
            .ok_or(DripError::MathError)?;
        let payer_refund = remaining_unpaid_stream_funds.min(available);

        if payer_refund > 0 {
            transfer_from_escrow(
                &ctx.accounts.escrow.to_account_info(),
                &ctx.accounts.payer.to_account_info(),
                &ctx.accounts.system_program.to_account_info(),
                stream.key(),
                ctx.accounts.escrow.key(),
                stream.escrow_bump,
                payer_refund,
            )?;
        }

        stream.is_cancelled = true;
        stream.last_withdraw_time = clock.unix_timestamp;

        emit!(StreamCancelled {
            stream: stream.key(),
            payer: stream.payer,
            receiver: stream.receiver,
            receiver_amount: receiver_payment,
            payer_refund,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(stream_id: u64)]
pub struct InitializeStream<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: receiver is stored as a pubkey and later must sign withdrawals.
    pub receiver: UncheckedAccount<'info>,
    #[account(
        init,
        payer = payer,
        space = 8 + StreamState::LEN,
        seeds = [b"stream", payer.key().as_ref(), receiver.key().as_ref(), &stream_id.to_le_bytes()],
        bump
    )]
    pub stream_state: Account<'info, StreamState>,
    /// CHECK: native SOL escrow PDA; no data is stored here.
    #[account(
        mut,
        seeds = [b"escrow", stream_state.key().as_ref()],
        bump
    )]
    pub escrow: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub receiver: Signer<'info>,
    #[account(
        mut,
        seeds = [b"stream", stream_state.payer.as_ref(), stream_state.receiver.as_ref(), &stream_state.stream_id.to_le_bytes()],
        bump = stream_state.bump
    )]
    pub stream_state: Account<'info, StreamState>,
    /// CHECK: native SOL escrow PDA.
    #[account(
        mut,
        seeds = [b"escrow", stream_state.key().as_ref()],
        bump = stream_state.escrow_bump
    )]
    pub escrow: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PauseStream<'info> {
    pub payer: Signer<'info>,
    #[account(
        mut,
        seeds = [b"stream", stream_state.payer.as_ref(), stream_state.receiver.as_ref(), &stream_state.stream_id.to_le_bytes()],
        bump = stream_state.bump
    )]
    pub stream_state: Account<'info, StreamState>,
}

#[derive(Accounts)]
pub struct ResumeStream<'info> {
    pub payer: Signer<'info>,
    #[account(
        mut,
        seeds = [b"stream", stream_state.payer.as_ref(), stream_state.receiver.as_ref(), &stream_state.stream_id.to_le_bytes()],
        bump = stream_state.bump
    )]
    pub stream_state: Account<'info, StreamState>,
}

#[derive(Accounts)]
pub struct CancelStream<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: receives earned funds when the stream is cancelled.
    #[account(mut)]
    pub receiver: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [b"stream", stream_state.payer.as_ref(), stream_state.receiver.as_ref(), &stream_state.stream_id.to_le_bytes()],
        bump = stream_state.bump
    )]
    pub stream_state: Account<'info, StreamState>,
    /// CHECK: native SOL escrow PDA.
    #[account(
        mut,
        seeds = [b"escrow", stream_state.key().as_ref()],
        bump = stream_state.escrow_bump
    )]
    pub escrow: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct StreamState {
    pub payer: Pubkey,
    pub receiver: Pubkey,
    pub stream_id: u64,
    pub deposited_amount: u64,
    pub withdrawn_amount: u64,
    pub flow_rate_per_second: u64,
    pub start_time: i64,
    pub last_withdraw_time: i64,
    pub pause_started_at: i64,
    pub total_paused_seconds: i64,
    pub max_budget: u64,
    pub expiration_time: i64,
    pub is_paused: bool,
    pub is_cancelled: bool,
    pub bump: u8,
    pub escrow_bump: u8,
}

impl StreamState {
    pub const LEN: usize = (32 * 2) + (8 * 10) + 4;
}

pub fn calculate_unlocked_amount(stream: &StreamState, current_time: i64) -> Result<u64> {
    let mut end_time = current_time;

    if stream.expiration_time > 0 && end_time > stream.expiration_time {
        end_time = stream.expiration_time;
    }

    if stream.is_paused && stream.pause_started_at > 0 && stream.pause_started_at < end_time {
        end_time = stream.pause_started_at;
    }

    let raw_elapsed = end_time
        .checked_sub(stream.start_time)
        .ok_or(DripError::MathError)?;
    let effective_elapsed = raw_elapsed
        .checked_sub(stream.total_paused_seconds)
        .ok_or(DripError::MathError)?;

    if effective_elapsed <= 0 {
        return Ok(0);
    }

    let unlocked = (effective_elapsed as u64)
        .checked_mul(stream.flow_rate_per_second)
        .ok_or(DripError::MathError)?;
    let mut capped = unlocked.min(stream.deposited_amount);

    if stream.max_budget > 0 {
        capped = capped.min(stream.max_budget);
    }

    Ok(capped)
}

fn transfer_from_escrow<'info>(
    escrow: &AccountInfo<'info>,
    recipient: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
    stream_key: Pubkey,
    escrow_key: Pubkey,
    escrow_bump: u8,
    amount: u64,
) -> Result<()> {
    let escrow_seeds: &[&[u8]] = &[b"escrow", stream_key.as_ref(), &[escrow_bump]];

    invoke_signed(
        &system_instruction::transfer(&escrow_key, recipient.key, amount),
        &[escrow.clone(), recipient.clone(), system_program.clone()],
        &[escrow_seeds],
    )?;

    Ok(())
}

fn escrow_lamports_available_for_stream(escrow: &AccountInfo) -> Result<u64> {
    let rent_exempt_minimum = Rent::get()?.minimum_balance(escrow.data_len());
    escrow
        .lamports()
        .checked_sub(rent_exempt_minimum)
        .ok_or(error!(DripError::InsufficientEscrowFunds))
}

#[event]
pub struct StreamCreated {
    pub stream: Pubkey,
    pub payer: Pubkey,
    pub receiver: Pubkey,
    pub deposited_amount: u64,
    pub flow_rate_per_second: u64,
    pub max_budget: u64,
    pub expiration_time: i64,
    pub start_time: i64,
}

#[event]
pub struct Withdrawn {
    pub stream: Pubkey,
    pub receiver: Pubkey,
    pub amount: u64,
    pub total_withdrawn: u64,
    pub timestamp: i64,
}

#[event]
pub struct StreamPaused {
    pub stream: Pubkey,
    pub payer: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct StreamResumed {
    pub stream: Pubkey,
    pub payer: Pubkey,
    pub paused_duration: i64,
    pub timestamp: i64,
}

#[event]
pub struct StreamCancelled {
    pub stream: Pubkey,
    pub payer: Pubkey,
    pub receiver: Pubkey,
    pub receiver_amount: u64,
    pub payer_refund: u64,
    pub timestamp: i64,
}

#[error_code]
pub enum DripError {
    #[msg("Deposit amount must be greater than zero")]
    InvalidDeposit,
    #[msg("Flow rate must be greater than zero")]
    InvalidFlowRate,
    #[msg("Receiver cannot be the same as payer")]
    InvalidReceiver,
    #[msg("Max budget cannot exceed deposited amount")]
    InvalidMaxBudget,
    #[msg("Expiration timestamp must be in the future")]
    InvalidExpiration,
    #[msg("Only the payer can perform this action")]
    UnauthorizedPayer,
    #[msg("Only the receiver can withdraw")]
    UnauthorizedReceiver,
    #[msg("Stream is currently paused")]
    StreamPaused,
    #[msg("Stream is already paused")]
    AlreadyPaused,
    #[msg("Stream is not paused")]
    NotPaused,
    #[msg("Stream is already cancelled")]
    AlreadyCancelled,
    #[msg("No funds available to withdraw")]
    NothingToWithdraw,
    #[msg("Escrow does not have enough stream funds available")]
    InsufficientEscrowFunds,
    #[msg("Math overflow or underflow")]
    MathError,
}
