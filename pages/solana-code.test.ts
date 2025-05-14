import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import assert from "assert";

describe("restaurant_booking", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.RestaurantBooking as Program<any>;
  const connection = provider.connection;
  const user = provider.wallet;

  // Test restaurant and dish keypairs
  const restaurant = Keypair.generate();
  const dish1 = Keypair.generate();
  const dish2 = Keypair.generate();

  // PDAs
  let userStatsPda;
  let dish1StatsPda;
  let dish2StatsPda;

  before(async () => {
    // Find PDAs
    [userStatsPda] = await PublicKey.findProgramAddress(
      [
        Buffer.from("user-stats"),
        user.publicKey.toBuffer(),
        restaurant.publicKey.toBuffer(),
      ],
      program.programId
    );

    [dish1StatsPda] = await PublicKey.findProgramAddress(
      [
        Buffer.from("dish-stats"),
        user.publicKey.toBuffer(),
        dish1.publicKey.toBuffer(),
      ],
      program.programId
    );

    [dish2StatsPda] = await PublicKey.findProgramAddress(
      [
        Buffer.from("dish-stats"),
        user.publicKey.toBuffer(),
        dish2.publicKey.toBuffer(),
      ],
      program.programId
    );
  });

  it("Initializes UserStats", async () => {
    await program.methods
      .initializeUserStats()
      .accounts({
        userStats: userStatsPda,
        user: user.publicKey,
        restaurant: restaurant.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const stats = await program.account.userStats.fetch(userStatsPda);
    console.log("UserStats visit count:", stats.visitCount.toNumber());
    assert(stats.visitCount.toNumber() === 0, "Visit count should start at 0");
  });

  it("Initializes DishStats with names", async () => {
    await program.methods
      .initializeDishStats("Chicken Rice")
      .accounts({
        dishStats: dish1StatsPda,
        user: user.publicKey,
        dish: dish1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .initializeDishStats("Nasi Lemak")
      .accounts({
        dishStats: dish2StatsPda,
        user: user.publicKey,
        dish: dish2.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const d1 = await program.account.dishStats.fetch(dish1StatsPda);
    const d2 = await program.account.dishStats.fetch(dish2StatsPda);

    // Convert name bytes to string
    const d1Name = Buffer.from(d1.nameData.slice(0, d1.nameLen)).toString();
    const d2Name = Buffer.from(d2.nameData.slice(0, d2.nameLen)).toString();

    console.log("Dish 1:", d1Name, "| Count:", d1.count.toNumber());
    console.log("Dish 2:", d2Name, "| Count:", d2.count.toNumber());

    assert(d1Name === "Chicken Rice", "Dish 1 name mismatch");
    assert(d2Name === "Nasi Lemak", "Dish 2 name mismatch");
  });

  it("Books a table and updates visit + dish counts", async () => {
    await program.methods
      .bookTable([dish1.publicKey, dish2.publicKey])
      .accounts({
        userStats: userStatsPda,
        restaurant: restaurant.publicKey,
        user: user.publicKey,
      })
      .remainingAccounts([
        { pubkey: dish1StatsPda, isWritable: true, isSigner: false },
        { pubkey: dish1.publicKey, isWritable: false, isSigner: false },
        { pubkey: dish2StatsPda, isWritable: true, isSigner: false },
        { pubkey: dish2.publicKey, isWritable: false, isSigner: false },
      ])
      .rpc();

    const stats = await program.account.userStats.fetch(userStatsPda);
    const d1 = await program.account.dishStats.fetch(dish1StatsPda);
    const d2 = await program.account.dishStats.fetch(dish2StatsPda);

    // Convert name bytes to string
    const d1Name = Buffer.from(d1.nameData.slice(0, d1.nameLen)).toString();
    const d2Name = Buffer.from(d2.nameData.slice(0, d2.nameLen)).toString();

    console.log("User visited:", stats.visitCount.toNumber(), "time(s)");
    console.log("Dish 1:", d1Name, "| Count:", d1.count.toNumber());
    console.log("Dish 2:", d2Name, "| Count:", d2.count.toNumber());

    assert(stats.visitCount.toNumber() === 1, "Visit count should be 1");
    assert(d1.count.toNumber() === 1, "Dish 1 count should be 1");
    assert(d2.count.toNumber() === 1, "Dish 2 count should be 1");
  });

  it("Fetches and organizes user data hierarchically with combined dishes", async () => {
    try {
      // Fetch all user stats for the current user
      const userStatsAccounts = await connection.getProgramAccounts(
        program.programId,
        {
          filters: [
            { dataSize: 8 + 32 + 32 + 8 }, // Size of UserStats
            { memcmp: { offset: 8, bytes: user.publicKey.toBase58() } }, // Filter by user
          ],
        }
      );

      // Fetch all dish stats for the current user
      const dishStatsAccounts = await connection.getProgramAccounts(
        program.programId,
        {
          filters: [
            { dataSize: 8 + 32 + 32 + 8 + 4 + 50 }, // Size of DishStats
            { memcmp: { offset: 8, bytes: user.publicKey.toBase58() } }, // Filter by user
          ],
        }
      );

      console.log(`Found ${userStatsAccounts.length} user stats accounts`);
      console.log(`Found ${dishStatsAccounts.length} dish stats accounts`);

      // Organize data hierarchically
      const userData = {
        userPublicKey: user.publicKey.toBase58(),
        restaurants: {},
      };

      // Process user stats (restaurant visits)
      for (const userStatsAccount of userStatsAccounts) {
        try {
          // Try to decode using the program's account decoder
          const userStats = await program.account.userStats.fetch(
            userStatsAccount.pubkey
          );
          const restaurantKey = userStats.restaurant.toBase58();

          userData.restaurants[restaurantKey] = {
            visitCount: userStats.visitCount.toNumber(),
            dishes: {}, // Will store dishes by name instead of by key
          };
        } catch (e) {
          console.log(
            `Error decoding user stats account ${userStatsAccount.pubkey.toBase58()}:`,
            e
          );
          // Skip this account if decoding fails
          continue;
        }
      }

      // Process dish stats - use dish name as key instead of dish pubkey
      for (const dishStatsAccount of dishStatsAccounts) {
        try {
          // Try to decode using the program's account decoder
          const dishStats = await program.account.dishStats.fetch(
            dishStatsAccount.pubkey
          );

          // Get the dish key
          const dishKey = dishStats.dish.toBase58();

          // For this test, we'll associate all dishes with our test restaurant
          const restaurantKey = restaurant.publicKey.toBase58();

          // Convert name bytes to string
          const nameLen = dishStats.nameLen || 0;
          const nameData = dishStats.nameData || [];
          const nameBytes = nameData.slice(0, nameLen);
          const dishName = Buffer.from(nameBytes).toString();

          // Make sure the restaurant entry exists
          if (!userData.restaurants[restaurantKey]) {
            userData.restaurants[restaurantKey] = {
              visitCount: 0,
              dishes: {},
            };
          }

          // Add dish to restaurant using dish name as key
          // If a dish with this name already exists, update its count
          if (userData.restaurants[restaurantKey].dishes[dishName]) {
            userData.restaurants[restaurantKey].dishes[dishName].count +=
              dishStats.count.toNumber();

            // Optionally add this dishKey to the pubkeys array
            userData.restaurants[restaurantKey].dishes[dishName].pubkeys.push(
              dishKey
            );
          } else {
            // Create a new entry for this dish name
            userData.restaurants[restaurantKey].dishes[dishName] = {
              name: dishName,
              count: dishStats.count.toNumber(),
              pubkeys: [dishKey], // Keep track of all pubkeys for this dish name
            };
          }
        } catch (e) {
          console.log(
            `Error decoding dish stats account ${dishStatsAccount.pubkey.toBase58()}:`,
            e
          );
          // Skip this account if decoding fails
          continue;
        }
      }

      console.log(
        "User data with combined dishes:",
        JSON.stringify(userData, null, 2)
      );

      // Check if we have data for our test restaurant
      if (Object.keys(userData.restaurants).length > 0) {
        console.log("Found restaurant data!");

        // If we have data for our specific test restaurant
        if (userData.restaurants[restaurant.publicKey.toBase58()]) {
          console.log("Found our test restaurant!");
          assert(
            userData.restaurants[restaurant.publicKey.toBase58()].visitCount >=
            1
          );

          // Check if we have dish data
          const dishes =
            userData.restaurants[restaurant.publicKey.toBase58()].dishes;
          if (Object.keys(dishes).length > 0) {
            console.log("Found dishes for our test restaurant!");

            // Check if we have both Chicken Rice and Nasi Lemak
            assert(dishes["Chicken Rice"], "Should have Chicken Rice");
            assert(dishes["Nasi Lemak"], "Should have Nasi Lemak");

            // Check counts
            console.log("Chicken Rice count:", dishes["Chicken Rice"].count);
            console.log("Nasi Lemak count:", dishes["Nasi Lemak"].count);

            // Log the number of different Chicken Rice and Nasi Lemak entries
            console.log(
              "Chicken Rice variants:",
              dishes["Chicken Rice"].pubkeys.length
            );
            console.log(
              "Nasi Lemak variants:",
              dishes["Nasi Lemak"].pubkeys.length
            );
          }
        }
      }
    } catch (error) {
      console.error("Error in test:", error);
      throw error;
    }
  });
});
