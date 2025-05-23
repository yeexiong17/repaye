import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { AnchorProvider, Program, web3, ProgramError, Idl } from '@coral-xyz/anchor';
import idl from '../idl/restaurant_booking.json';

// This type can be used for casting, but won't be used as Program<T> generic due to TS limitations with raw JSON IDLs
export type RestaurantBookingIdl = typeof idl;

// Program ID from IDL
export const programID = new PublicKey("9MGNGbBKQqxDhVkRxuH5qDyovnpUw1FviYEUNcN7WUD");

// Options for provider
export const opts = {
    preflightCommitment: 'processed' as web3.Commitment
};

// Create a program instance
export const getProgram = (wallet: any, connection: Connection): Program | null => {
    if (!wallet || !connection) {
        console.error("Missing wallet or connection");
        return null;
    }

    try {
        // Validate that wallet.publicKey exists and is a valid PublicKey
        if (!wallet.publicKey) {
            console.error("Wallet public key is undefined");
            return null;
        }

        // Ensure the wallet.publicKey is a proper PublicKey instance
        try {
            const publicKeyString = wallet.publicKey.toString();
            console.log("Creating provider with wallet:", publicKeyString);
        } catch (err) {
            console.error("Invalid wallet public key:", err);
            return null;
        }

        // Create provider
        const provider = new AnchorProvider(connection, wallet, opts);

        console.log("Initializing program with ID:", programID.toString());

        // Create the program instance directly with the proper typing
        try {
            // Use `idl as any` to bypass strict compile-time IDL type checking if using raw JSON
            const program = new Program(idl as any, programID, provider);
            return program;
        } catch (err) {
            console.error("Error creating program:", err);
            return null;
        }
    } catch (error) {
        console.error("Error initializing provider:", error);
        return null;
    }
};

// Generate a consistent Public Key from a restaurant ID
export const getRestaurantPublicKey = (restaurantId: number): PublicKey => {
    const restaurantIdString = `restaurant-${restaurantId}`;
    const restaurantIdBuffer = Buffer.from(restaurantIdString);
    return new PublicKey(restaurantIdBuffer);
};

// Find user stats PDA
export const findUserStatsPDA = async (
    userPublicKey: PublicKey,
    restaurantPublicKey: PublicKey,
    programId: PublicKey
) => {
    return PublicKey.findProgramAddress(
        [
            Buffer.from('user-stats'),
            userPublicKey.toBuffer(),
            restaurantPublicKey.toBuffer(),
        ],
        programId
    );
};

// Find dish stats PDA
export const findDishStatsPDA = async (
    userPublicKey: PublicKey,
    dishPublicKey: PublicKey,
    programId: PublicKey
) => {
    return PublicKey.findProgramAddress(
        [
            Buffer.from('dish-stats'),
            userPublicKey.toBuffer(),
            dishPublicKey.toBuffer(),
        ],
        programId
    );
};

// Initialize dish stats
export const initializeDishStats = async (
    program: Program,
    userPublicKey: PublicKey,
    dishPublicKey: PublicKey,
    dishName: string
) => {
    if (!program) throw new Error('Program not initialized');

    // Find the PDA
    const [dishStatsPda] = await findDishStatsPDA(
        userPublicKey,
        dishPublicKey,
        program.programId
    );

    // Call the program
    return program.methods
        .initializeDishStats(dishName)
        .accounts({
            dishStats: dishStatsPda,
            user: userPublicKey,
            dish: dishPublicKey,
            systemProgram: SystemProgram.programId,
        })
        .rpc();
};

export interface DishToBook {
    dishPublicKey: PublicKey;
    dishName: string;
}

// Book a table - New version that bundles transactions and payment
export const bookTable = async (
    program: Program,
    userPublicKey: PublicKey,
    restaurantPublicKey: PublicKey,
    dishesToBook: DishToBook[],
    paymentAmountLamports: number,      // ADDED: Amount for payment transfer
    restaurantPaymentWallet: PublicKey  // ADDED: Restaurant's wallet for payment
): Promise<string> => { // Returns transaction signature
    if (!program) throw new Error('Program not initialized');
    if (!dishesToBook || dishesToBook.length === 0) {
        // It's valid to book a table without pre-selecting dishes,
        // in which case dish-specific logic is skipped.
        console.log("Booking table without pre-selected dishes.");
    }

    const provider = program.provider as AnchorProvider;
    const transaction = new web3.Transaction();
    const instructions: TransactionInstruction[] = [];

    // 0. PREPEND SystemProgram.transfer instruction for the payment
    if (paymentAmountLamports > 0) {
        instructions.push(
            SystemProgram.transfer({
                fromPubkey: userPublicKey, // User pays
                toPubkey: restaurantPaymentWallet, // Restaurant receives payment
                lamports: paymentAmountLamports,
            })
        );
        console.log(`Added payment transfer of ${paymentAmountLamports} lamports to ${restaurantPaymentWallet.toBase58()} to transaction.`);
    }

    const dishStatsPdasForBookTable: PublicKey[] = [];
    const dishIdsForBookTable: PublicKey[] = [];

    // 1. Prepare InitializeDishStats instructions if needed for each dish
    if (dishesToBook && dishesToBook.length > 0) {
        for (const dish of dishesToBook) {
            if (!dish.dishPublicKey || !dish.dishName) {
                console.warn("Skipping dish with missing publicKey or name:", dish);
                continue;
            }
            const [dishStatsPda, _bump] = await findDishStatsPDA(
                userPublicKey,
                dish.dishPublicKey,
                program.programId
            );
            dishStatsPdasForBookTable.push(dishStatsPda);
            dishIdsForBookTable.push(dish.dishPublicKey);

            // Check if DishStats account exists
            const accountInfo = await provider.connection.getAccountInfo(dishStatsPda);
            if (!accountInfo || accountInfo.data.length === 0) {
                console.log(`DishStats PDA ${dishStatsPda.toBase58()} for dish '${dish.dishName}' (PK: ${dish.dishPublicKey.toBase58()}) does not exist. Creating initialize instruction.`);
                const initializeDishStatsIx = await program.methods
                    .initializeDishStats(dish.dishName)
                    .accounts({
                        dishStats: dishStatsPda,
                        user: userPublicKey,
                        dish: dish.dishPublicKey,
                        systemProgram: SystemProgram.programId,
                    })
                    .instruction();
                instructions.push(initializeDishStatsIx);
            } else {
                console.log(`DishStats PDA ${dishStatsPda.toBase58()} for dish '${dish.dishName}' already exists.`);
            }
        }
    }


    // 2. Prepare BookTable instruction (which handles UserStats via init_if_needed)
    const [userStatsPda, _userStatsBump] = await findUserStatsPDA(
        userPublicKey,
        restaurantPublicKey,
        program.programId
    );

    const remainingAccountsForBookTable: { pubkey: PublicKey; isWritable: boolean; isSigner: boolean }[] = [];
    // The smart contract iterates remaining_accounts by 2, using the first of each pair.
    // So, we must pass pairs: (DishStatsPDA, corresponding DishPK)
    for (let i = 0; i < dishStatsPdasForBookTable.length; i++) {
        remainingAccountsForBookTable.push(
            { pubkey: dishStatsPdasForBookTable[i], isWritable: true, isSigner: false }, // This is the DishStats PDA
            { pubkey: dishIdsForBookTable[i], isWritable: false, isSigner: false }    // This is the original Dish PublicKey
        );
    }

    console.log("Preparing bookTable instruction with UserStats PDA:", userStatsPda.toBase58());
    if (dishIdsForBookTable.length > 0) {
        console.log("Dish IDs for bookTable method arg:", dishIdsForBookTable.map(pk => pk.toBase58()));
        console.log("Remaining accounts for bookTable (DishStats PDAs and Dish PKs):", remainingAccountsForBookTable.map(acc => ({ ...acc, pubkey: acc.pubkey.toBase58() })));
    }


    const bookTableIx = await program.methods
        .bookTable(dishIdsForBookTable) // This is the Vec<Pubkey> argument for the instruction method
        .accounts({
            userStats: userStatsPda,
            restaurant: restaurantPublicKey,
            user: userPublicKey,
            systemProgram: SystemProgram.programId, // Required for init_if_needed on userStats
        })
        .remainingAccounts(remainingAccountsForBookTable) // These are the additional accounts for the instruction
        .instruction();
    instructions.push(bookTableIx);

    // Add all instructions to the transaction
    // Order: InitializeDishStats instructions first, then BookTable.
    transaction.add(...instructions);

    // 3. Send the single transaction
    console.log(`Sending transaction with ${instructions.length} instructions.`);
    if (instructions.length === 0) {
        // This case should ideally not happen if bookTableIx is always added.
        // However, if dishesToBook was empty and bookTableIx somehow wasn't added, this is a safeguard.
        // Realistically, bookTableIx will always be present.
        console.warn("No instructions to send. This might indicate an issue.");
        throw new Error("No instructions prepared for the transaction.");
    }

    try {
        // Ensure the provider's wallet is used as the fee payer and for signing.
        transaction.feePayer = provider.wallet.publicKey;
        transaction.recentBlockhash = (await provider.connection.getLatestBlockhash()).blockhash;

        // The AnchorProvider's sendAndConfirm method handles signing with the provider's wallet.
        const txSignature = await provider.sendAndConfirm(transaction, [], {
            skipPreflight: false, // Set to true if you encounter issues with preflight, but generally false is safer.
            commitment: 'confirmed', // Or 'processed' / 'finalized' depending on desired confirmation level
        });
        console.log("Single transaction successful with signature:", txSignature);
        return txSignature;
    } catch (error) {
        console.error("Error sending/confirming bundled transaction:", error);
        // Attempt to log more details from the error, similar to submitReview
        if (error instanceof Error) {
            console.error("Error name:", error.name);
            console.error("Error message:", error.message);
        }
        const anyError = error as any;
        if (anyError?.logs) {
            console.error("Transaction logs:", anyError.logs.join('\\n'));
        }
        throw error; // Re-throw the error to be handled by the caller
    }
};

// Fetch user data
export const fetchUserData = async (
    program: Program,
    connection: Connection,
    userPublicKey: PublicKey
) => {
    if (!program || !connection || !userPublicKey) {
        console.error("fetchUserData: Missing required parameters");
        throw new Error('fetchUserData: Missing required parameters');
    }

    console.log(`fetchUserData: Starting for user ${userPublicKey.toBase58()}`);

    // This structure is for reference from previous logic/attempts.
    const legacyUserDataStructure_REFERENCE_ONLY: {
        userPublicKey: string;
        restaurants: Record<string, {
            visitCount: number;
            restaurantPublicKey: string;
            dishes: Record<string, {
                name: string;
                count: number;
                pubkeys: string[];
            }>;
        }>;
    } = {
        userPublicKey: userPublicKey.toBase58(),
        restaurants: {},
    };

    try {
        // 1. Fetch all UserStats accounts for the user
        const userStatsAccounts = await program.account.userStats.all([
            { memcmp: { offset: 8, bytes: userPublicKey.toBase58() } }
        ]);
        console.log(`fetchUserData: Found ${userStatsAccounts.length} UserStats accounts for user ${userPublicKey.toBase58()}`);

        // Initialize the structure for the data that will be returned
        const processedUserData: {
            userPublicKey: string;
            restaurants: Record<string, { // Keyed by actual Restaurant PublicKey string
                visitCount: number;
                userStatsPda: string;
            }>;
            allUserDishes: Record<string, { // Keyed by dish name
                name: string;
                count: number;
                pubkeys: string[]; // Array of DishStats PDAs for this dish name
                dishPks: string[]; // Array of original dish.publicKey for this dish name
            }>;
        } = {
            userPublicKey: userPublicKey.toBase58(),
            restaurants: {},
            allUserDishes: {},
        };

        for (const uStatsAccount of userStatsAccounts) {
            // Ensure accountData and its fields are correctly typed or cast safely
            const accountData = uStatsAccount.account as any;
            if (accountData && accountData.restaurant && typeof accountData.visitCount?.toNumber === 'function') {
                const restaurantPkString = accountData.restaurant.toBase58();
                processedUserData.restaurants[restaurantPkString] = {
                    visitCount: accountData.visitCount.toNumber(),
                    userStatsPda: uStatsAccount.publicKey.toBase58(),
                };
            } else {
                console.warn("fetchUserData: Skipping malformed UserStats account:", uStatsAccount.publicKey.toBase58());
            }
        }

        // 2. Fetch all DishStats accounts for the user
        // This is the ONLY declaration of dishStatsAccounts within this function scope.
        const dishStatsAccounts = await program.account.dishStats.all([
            { memcmp: { offset: 8, bytes: userPublicKey.toBase58() } }
        ]);
        console.log(`fetchUserData: Found ${dishStatsAccounts.length} DishStats accounts for user ${userPublicKey.toBase58()}`);

        for (const dStatsAccount of dishStatsAccounts) {
            // Ensure accountData and its fields are correctly typed or cast safely
            const accountData = dStatsAccount.account as any;
            if (accountData && accountData.nameData && typeof accountData.nameLen === 'number' && typeof accountData.count?.toNumber === 'function' && accountData.dish) {
                const dishName = Buffer.from(accountData.nameData.slice(0, accountData.nameLen)).toString();
                const dishStatsPdaString = dStatsAccount.publicKey.toBase58();
                const originalDishPkString = accountData.dish.toBase58();

                if (!processedUserData.allUserDishes[dishName]) {
                    processedUserData.allUserDishes[dishName] = {
                        name: dishName,
                        count: 0,
                        pubkeys: [],
                        dishPks: [],
                    };
                }
                processedUserData.allUserDishes[dishName].count += accountData.count.toNumber();
                processedUserData.allUserDishes[dishName].pubkeys.push(dishStatsPdaString);
                if (!processedUserData.allUserDishes[dishName].dishPks.includes(originalDishPkString)) {
                    processedUserData.allUserDishes[dishName].dishPks.push(originalDishPkString);
                }
            } else {
                console.warn("fetchUserData: Skipping malformed DishStats account:", dStatsAccount.publicKey.toBase58());
            }
        }

        console.log("fetchUserData: Processed user data:", JSON.stringify(processedUserData, null, 2));
        return processedUserData;

    } catch (error) {
        console.error("fetchUserData: Error during data fetching or processing:", error);
        // Return a default/empty structure on error to prevent crashes in the UI
        return {
            userPublicKey: userPublicKey.toBase58(),
            restaurants: {},
            allUserDishes: {},
        };
    }
};

// Find review PDA
export const findReviewPDA = (program: Program, user: PublicKey, restaurant: PublicKey): PublicKey => {
    const [reviewPDA, _bump] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("review"),
            user.toBuffer(),
            restaurant.toBuffer(),
        ],
        program.programId
    );
    return reviewPDA;
};

export interface RawReview {
    user: PublicKey;
    restaurant: PublicKey;
    rating: number;
    reviewLen: number;
    reviewData: number[];
    confidenceLevel: number;
}

export interface ProcessedReview {
    publicKey: PublicKey;
    user: PublicKey;
    restaurant: PublicKey;
    rating: number;
    reviewText: string;
    confidenceLevel: number;
}

const PROGRAM_ERROR_CODES = {
    InvalidRating: 6000,
    ReviewAlreadyExists: 6001,
    InvalidConfidenceLevel: 6002,
};

function isProgramError(error: any): error is ProgramError {
    return error instanceof ProgramError || (error && typeof error.code === 'number' && typeof error.msg === 'string');
}

export const submitReview = async (
    program: Program,
    user: PublicKey,
    restaurant: PublicKey,
    rating: number,
    reviewText: string,
    confidenceLevel: number
): Promise<string> => {
    const reviewPDA = findReviewPDA(program, user, restaurant);

    try {
        const txSignature = await program.methods
            .submitReview(rating, reviewText, confidenceLevel)
            .accounts({
                review: reviewPDA,
                restaurant: restaurant,
                user: user,
                systemProgram: SystemProgram.programId,
            })
            .rpc();
        return txSignature;
    } catch (error: any) {
        console.error("Raw error submitting review:", error);
        console.error("Error name:", error?.name);
        console.error("Error message:", error?.message);
        if (error?.logs) {
            console.error("Transaction logs:", error.logs);
        }

        if (error?.message?.includes("already processed") ||
            error?.message?.includes("already been processed")) {
            console.warn("Transaction was likely already processed. Assuming success.");
            throw new Error("TRANSACTION_ALREADY_PROCESSED");
        }

        if (isProgramError(error)) {
            if (error.code === PROGRAM_ERROR_CODES.ReviewAlreadyExists) {
                throw new Error("Review already submitted for this restaurant by this user.");
            }
            if (error.code === PROGRAM_ERROR_CODES.InvalidConfidenceLevel) {
                throw new Error("Confidence level must be between 1 and 10.");
            }
            if (error.code === PROGRAM_ERROR_CODES.InvalidRating) {
                throw new Error("Rating must be between 1 and 5.");
            }
        }

        let detailedMessage = "Failed to submit review.";
        if (error instanceof Error) {
            detailedMessage += ` ${error.message}`;
        } else if (typeof error === 'string') {
            detailedMessage += ` ${error}`;
        } else {
            detailedMessage += " An unknown error occurred.";
        }
        throw new Error(detailedMessage);
    }
};

export const fetchUserStatsForSingleRestaurant = async (
    program: Program,
    userPublicKey: PublicKey,
    restaurantPublicKey: PublicKey
): Promise<{ visitCount: number } | null> => {
    if (!program || !userPublicKey || !restaurantPublicKey) {
        console.error("fetchUserStatsForSingleRestaurant: Missing required parameters");
        return null;
    }
    try {
        const [userStatsPda, _bump] = await findUserStatsPDA(
            userPublicKey,
            restaurantPublicKey,
            program.programId
        );
        const userStatsAccount = await program.account.userStats.fetch(userStatsPda) as any;
        if (userStatsAccount && typeof userStatsAccount.visitCount?.toNumber === 'function') {
            return { visitCount: userStatsAccount.visitCount.toNumber() };
        }
        return { visitCount: 0 }; // Account might exist but be malformed, or not exist (fetch would throw)
    } catch (error: any) {
        if (error.message?.includes("Account does not exist")) {
            console.log(`No UserStats account found for user ${userPublicKey.toBase58()} at restaurant ${restaurantPublicKey.toBase58()}. Assuming 0 visits.`);
            return { visitCount: 0 }; // Treat as 0 visits if no stats account
        }
        console.error(`Error fetching user stats for restaurant ${restaurantPublicKey.toBase58()}:`, error);
        return null; // Indicate an actual error occurred
    }
};

export const fetchReviewsForRestaurant = async (
    program: Program,
    restaurantPublicKey: PublicKey
) => {
    if (!program) throw new Error('Program not initialized');

    try {
        const reviewAccounts = await program.account.review.all([
            {
                memcmp: {
                    offset: 8 + 32,
                    bytes: restaurantPublicKey.toBase58(),
                }
            }
        ]);

        console.log(`Fetched ${reviewAccounts.length} reviews for restaurant ${restaurantPublicKey.toBase58()}`);

        return reviewAccounts.map((acc: any) => {
            const rawReview = acc.account as RawReview;
            return {
                publicKey: acc.publicKey,
                user: rawReview.user,
                restaurant: rawReview.restaurant,
                rating: rawReview.rating,
                reviewText: Buffer.from(rawReview.reviewData.slice(0, rawReview.reviewLen)).toString(),
                confidenceLevel: rawReview.confidenceLevel,
            };
        });
    } catch (error) {
        console.error(`Error fetching reviews for restaurant ${restaurantPublicKey.toBase58()}:`, error);
        return [];
    }
};

export const fetchUserReviewForRestaurant = async (
    program: Program,
    userPublicKey: PublicKey,
    restaurantPublicKey: PublicKey
) => {
    if (!program) throw new Error('Program not initialized');

    try {
        const reviewPda = findReviewPDA(
            program,
            userPublicKey,
            restaurantPublicKey
        );
        // Explicitly type the account fetched if program typing is loose
        const reviewAccount = await program.account.review.fetch(reviewPda) as unknown as RawReview | null;

        if (reviewAccount) {
            // Ensure reviewLen and rating are accessed safely, now that reviewAccount is RawReview
            if ((reviewAccount.reviewLen || 0) > 0 || reviewAccount.rating > 0) {
                // No need to cast to RawReview again, it already is.
                return {
                    publicKey: reviewPda,
                    user: reviewAccount.user,
                    restaurant: reviewAccount.restaurant,
                    rating: reviewAccount.rating,
                    reviewText: Buffer.from(reviewAccount.reviewData.slice(0, reviewAccount.reviewLen)).toString(),
                    confidenceLevel: reviewAccount.confidenceLevel,
                };
            }
        }
        return null;
    } catch (error) {
        if (error.message?.includes("Account does not exist")) {
            console.log(`No existing review found for user ${userPublicKey.toBase58()} at restaurant ${restaurantPublicKey.toBase58()}`);
            return null;
        }
        console.error(`Error fetching user review for restaurant ${restaurantPublicKey.toBase58()}:`, error);
        return null;
    }
}; 