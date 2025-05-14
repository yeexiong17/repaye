# Solana Smart Contract Integration Guide

This document explains how the Solana smart contract for restaurant bookings has been integrated with the frontend application.

## Overview

The integration connects our React/Next.js frontend application with a Solana smart contract that handles:
- User stats tracking for restaurants
- Dish stats tracking for user orders
- Booking tables with selected dishes

## Project Structure

- `idl/restaurant_booking.json` - Interface Definition Language (IDL) for the Anchor program
- `utils/program.ts` - Utility functions for interacting with the Solana program
- `types/global.d.ts` - TypeScript declarations for Solana-related window objects
- `pages/index.tsx` - Main page with restaurant listings and booking history
- `components/BookingModal.tsx` - Modal for booking tables with Solana integration

## How It Works

1. **Wallet Connection**:
   - The app connects to Phantom or other Solana wallets through `@solana/wallet-adapter`
   - User authentication is managed through the connected wallet's public key

2. **Restaurant Booking Flow**:
   - When a user clicks "Book" on a restaurant:
     - The app checks if UserStats already exists for this user-restaurant pair
     - If not, it initializes UserStats first
     - Then opens the booking modal
   - In the booking modal:
     - User selects date, time, number of guests, and dishes
     - For each selected dish, the app initializes or retrieves DishStats
     - When user confirms booking, it sends a transaction to the Solana network calling the `bookTable` function

3. **Booking History**:
   - When a wallet is connected, the app fetches all UserStats and DishStats for the current user
   - Displays a summary of visits per restaurant and dishes ordered
   - Organizes the data hierarchically and combines dishes with the same name

## Solana Program Functions

1. **initializeUserStats** - Creates a new account to track a user's visits to a specific restaurant
2. **initializeDishStats** - Creates a new account to track a user's orders of a specific dish
3. **bookTable** - Books a table at a restaurant and updates visit and dish counts

## Technical Details

- The app uses Devnet for development (change to Mainnet for production)
- Restaurant IDs are converted to Solana public keys using a deterministic padding method
- Dish IDs are generated using Keypairs and persisted in memory
- The app combines dish stats by name rather than by ID for better UX

## Troubleshooting

If you experience issues with the Solana integration:

1. **Wallet Connection Issues**:
   - Make sure you have Phantom or another Solana wallet installed
   - Check that you're on the right network (Devnet for testing)

2. **Transaction Errors**:
   - Check browser console for detailed error messages
   - Ensure your wallet has enough SOL for the transaction fees
   - Verify that your program ID matches the one in `idl/restaurant_booking.json`

3. **Account Initialization Errors**:
   - If you see "Account already in use" errors, it means the PDA already exists
   - The app should handle this gracefully by finding the existing account

4. **Data Not Showing Up**:
   - Check that the account data format in your Rust program matches the IDL
   - Make sure the discriminator names ('UserStats', 'DishStats') match your Rust program

## Testing

To verify the integration is working:
1. Connect your Solana wallet
2. Book a table with some dishes
3. Check your booking history to see the restaurant and dishes appear
4. Book again at the same restaurant with some dishes to see the counts increase

## Known Limitations

- The current implementation associates dishes with all restaurants in the booking history
- In a production app, you should track which dishes belong to which restaurant
- Dishes are stored in memory and will reset on page refresh

## Next Steps

- Implement proper restaurant-dish relationships
- Add persistent storage for restaurant and dish IDs
- Add proper error handling and retry mechanisms
- Implement transaction signing for non-wallet operations