import { useState, useMemo, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, X, DollarSign, Loader2, CheckCircle2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { useWallet, useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey, Transaction, SystemProgram, Keypair } from '@solana/web3.js';
import Image from 'next/image';
import { useRouter } from 'next/router';
import SuccessMessageBox from './SuccessMessageBox';
import { getProgram, getRestaurantPublicKey, findDishStatsPDA, bookTable, initializeDishStats } from '../utils/program';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurant: {
    id: number;
    name: string;
    cuisine: string;
  };
  onConfirm: (booking: {
    date: Date;
    time: string;
    guests: number;
    specialRequests: string;
    selectedDishes: string[];
    totalPrice: number;
    transactionSignature?: string;
  }) => void;
}

interface Dish {
  name: string;
  price: number;
  description: string;
}

const SAMPLE_DISHES: Dish[] = [
  {
    name: "Chef's Special Sushi Platter",
    price: 24.99,
    description: "Premium selection of fresh sushi and sashimi"
  },
  {
    name: "Vegetarian Delight Combo",
    price: 18.99,
    description: "Assorted vegetarian dishes with organic ingredients"
  },
  {
    name: "Signature Pasta Selection",
    price: 19.99,
    description: "House-made pasta with your choice of sauce"
  },
  {
    name: "Grilled Seafood Feast",
    price: 29.99,
    description: "Fresh seafood selection grilled to perfection"
  },
  {
    name: "Traditional Family Set",
    price: 49.99,
    description: "Perfect for sharing, serves 3-4 people"
  },
];

const TIME_SLOTS = [
  "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM",
  "1:00 PM", "1:30 PM",
  "2:00 PM", "2:30 PM",
  "5:00 PM", "5:30 PM",
  "6:00 PM", "6:30 PM",
  "7:00 PM", "7:30 PM",
  "8:00 PM", "8:30 PM",
];

const BOOKING_FEE = 5.00;
const SERVICE_CHARGE_PERCENTAGE = 10;

// Restaurant wallet address (replace with your actual restaurant wallet)
const RESTAURANT_WALLET = '7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh6UYBWwm6y1M'; // Example valid Solana address

export default function BookingModal({ isOpen, onClose, restaurant, onConfirm }: BookingModalProps) {
  const router = useRouter();
  const wallet = useWallet();
  const { publicKey, sendTransaction } = wallet;
  const anchorWallet = useAnchorWallet();
  const { connection } = useConnection();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [guests, setGuests] = useState(2);
  const [specialRequests, setSpecialRequests] = useState("");
  const [selectedDishes, setSelectedDishes] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionSignature, setTransactionSignature] = useState<string | null>(null);
  const [programInitialized, setProgramInitialized] = useState(false);
  const [dishKeypairs] = useState<Map<string, Keypair>>(
    new Map(SAMPLE_DISHES.map(dish => [dish.name, Keypair.generate()]))
  );
  const [program, setProgram] = useState<any>(null);

  // Initialize Solana program
  useEffect(() => {
    if (publicKey && connection && anchorWallet) {
      try {
        // Verify that anchor wallet has a valid public key
        if (!anchorWallet.publicKey) {
          console.error("AnchorWallet connected but publicKey is not available yet");
          setProgramInitialized(false);
          return;
        }

        const programInstance = getProgram(anchorWallet, connection);

        if (programInstance) {
          console.log("Solana program initialized with wallet:", publicKey.toString());
          setProgram(programInstance);
          setProgramInitialized(true);
        } else {
          console.error("Failed to initialize Solana program");
          setProgramInitialized(false);
        }
      } catch (error) {
        console.error("Error initializing Solana program:", error);
        setProgramInitialized(false);
      }
    } else {
      console.log("Cannot initialize program. Missing dependencies:", {
        publicKey: !!publicKey,
        connection: !!connection,
        anchorWallet: !!anchorWallet
      });
    }
  }, [publicKey, connection, anchorWallet]);

  const priceBreakdown = useMemo(() => {
    const subtotal = selectedDishes.reduce((total, dishName) => {
      const dish = SAMPLE_DISHES.find(d => d.name === dishName);
      return total + (dish?.price || 0);
    }, 0);

    const serviceCharge = (subtotal * SERVICE_CHARGE_PERCENTAGE) / 100;
    const total = subtotal + serviceCharge + BOOKING_FEE;

    return {
      subtotal,
      serviceCharge,
      bookingFee: BOOKING_FEE,
      total
    };
  }, [selectedDishes]);

  if (!isOpen) return null;

  const handlePayment = async () => {
    if (!publicKey || !sendTransaction) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      try {
        new PublicKey(RESTAURANT_WALLET);
      } catch (err) {
        throw new Error('Invalid restaurant wallet address');
      }

      const balance = await connection.getBalance(publicKey);
      const SOL_PRICE_USD = 100;
      const solAmount = priceBreakdown.total / SOL_PRICE_USD;
      const requiredLamports = Math.floor(solAmount * LAMPORTS_PER_SOL);

      if (balance < requiredLamports) {
        throw new Error(`Insufficient balance. Required: ${solAmount.toFixed(4)} SOL`);
      }

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(RESTAURANT_WALLET),
          lamports: requiredLamports,
        })
      );

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signature = await sendTransaction(transaction, connection);

      try {
        const confirmation = await Promise.race([
          connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight
          }, 'confirmed'),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Transaction timeout')), 30000)
          )
        ]);

        const confirmationError =
          confirmation &&
          typeof confirmation === 'object' &&
          'value' in confirmation &&
          confirmation.value &&
          typeof confirmation.value === 'object' &&
          'err' in confirmation.value &&
          confirmation.value.err;

        if (confirmationError) {
          throw new Error('Transaction failed to confirm');
        }

        setTransactionSignature(signature);

        // Now handle the Solana program booking part
        const solanaBookingSuccessful = await handleSolanaBooking();

        if (solanaBookingSuccessful) {
          onConfirm({
            date: selectedDate,
            time: selectedTime,
            guests,
            specialRequests,
            selectedDishes,
            totalPrice: priceBreakdown.total,
            transactionSignature: signature,
          });

          // Redirect to rating page to prompt for review
          setTimeout(() => {
            router.push(`/rating/${restaurant.id}?tx=${signature}&promptReview=true`);
          }, 1000); // Shortened delay for quicker redirect to review
        } else {
          // If solanaBookingSuccessful is false, an error message should already be set by handleSolanaBooking
          // We might not need to do anything extra here, or perhaps ensure a generic error if not already set.
          if (!error) { // Check if 'error' state is not already set by handleSolanaBooking
            setError("Failed to finalize booking on the Solana network. Payment was processed, but please contact support.");
          }
          // Do not proceed with success actions like onConfirm or redirecting to review page
        }

      } catch (confirmError: any) {
        if (confirmError.message === 'Transaction timeout') {
          setError(
            `Transaction sent but confirmation pending. Please check the status using the Solana Explorer: ` +
            `https://explorer.solana.com/tx/${signature}`
          );

          // We still call onConfirm here as the transaction was sent.
          // However, we might not want to prompt for a review immediately if confirmation is pending.
          // For now, let's keep the existing behavior of redirecting to bookings page.
          setTimeout(() => {
            router.push(`/bookings?tx=${signature}`);
          }, 3000);
        } else {
          throw confirmError;
        }
      }

    } catch (err) {
      console.error('Payment error:', err);
      setError(`Payment failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSolanaBooking = async () => {
    if (!publicKey || !connection || !program) {
      setError('Solana program not initialized or wallet not connected');
      return;
    }

    try {
      console.log("Processing Solana booking for restaurant:", restaurant.id);

      // Get restaurant public key
      const restaurantPublicKey = getRestaurantPublicKey(restaurant.id);

      // Process each selected dish
      const dishPublicKeys: PublicKey[] = [];
      const dishStatsPdas: PublicKey[] = [];

      // Initialize each dish stats if needed and collect public keys
      for (const dishName of selectedDishes) {
        const dishKeyPair = dishKeypairs.get(dishName);
        if (!dishKeyPair) continue;

        const dishPublicKey = dishKeyPair.publicKey;
        dishPublicKeys.push(dishPublicKey);

        // Find the PDA for this dish
        const [dishStatsPda] = await findDishStatsPDA(
          publicKey,
          dishPublicKey,
          program.programId
        );
        dishStatsPdas.push(dishStatsPda);

        // Initialize dish stats (this would create the account on chain)
        try {
          await initializeDishStats(
            program,
            publicKey,
            dishPublicKey,
            dishName
          );
          console.log(`Initialized dish stats for "${dishName}"`);
        } catch (e) {
          console.log(`Dish stats may already exist for "${dishName}"`, e);
          // Continue even if initialization fails (might already exist)
        }
      }

      // Book the table with all selected dishes
      if (dishPublicKeys.length > 0) {
        const bookingTx = await bookTable(
          program,
          publicKey,
          restaurantPublicKey,
          dishPublicKeys,
          dishStatsPdas
        );

        console.log("Successfully booked table on chain, tx:", bookingTx);
      }

      return true; // Indicate success
    } catch (error) {
      console.error("Error in Solana booking:", error);
      setError(`Solana booking error: ${error instanceof Error ? error.message : String(error)}`);
      return false; // Indicate failure
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!publicKey) {
      console.log("No public key")
      return;
    }

    if (!selectedTime) {
      setError('Please select a time for your booking');
      return;
    }

    // All validations passed, proceed with booking
    await handlePayment();
  };

  const toggleDish = (dish: string) => {
    setSelectedDishes(prev => {
      if (prev.includes(dish)) {
        return prev.filter(d => d !== dish);
      } else {
        return [...prev, dish];
      }
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Book a Table at {restaurant.name}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {!publicKey && (
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <div className="flex flex-col items-center justify-center">
                <p className="text-blue-700 mb-3 text-center">Please connect your wallet to make a booking with Solana</p>
                <button
                  type="button"
                  onClick={() => wallet.connect()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Connect Wallet
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Date
              </label>
              <input
                type="date"
                min={format(new Date(), 'yyyy-MM-dd')}
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Time
              </label>
              <div className="grid grid-cols-4 gap-2">
                {TIME_SLOTS.map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => setSelectedTime(time)}
                    className={`p-2 rounded-lg border ${selectedTime === time
                      ? 'bg-blue-500 text-white'
                      : 'hover:bg-gray-50'
                      }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Guests
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pre-order Dishes (Optional)
              </label>
              <div className="grid grid-cols-1 gap-2">
                {SAMPLE_DISHES.map((dish) => (
                  <label
                    key={dish.name}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedDishes.includes(dish.name)}
                        onChange={() => toggleDish(dish.name)}
                        className="mt-1 rounded"
                      />
                      <div>
                        <div className="font-medium">{dish.name}</div>
                        <div className="text-sm text-gray-500">{dish.description}</div>
                      </div>
                    </div>
                    <div className="text-blue-600 font-semibold">
                      ${dish.price.toFixed(2)}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-3">Price Breakdown</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${priceBreakdown.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Service Charge ({SERVICE_CHARGE_PERCENTAGE}%)</span>
                  <span>${priceBreakdown.serviceCharge.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Booking Fee</span>
                  <span>${priceBreakdown.bookingFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total</span>
                  <span>${priceBreakdown.total.toFixed(2)}</span>
                </div>
                <div className="text-sm text-gray-500 mt-2 flex items-center gap-2">
                  <Image
                    src="/solana-logo.svg"
                    alt="Solana"
                    width={16}
                    height={16}
                    className="inline-block"
                  />
                  <span>≈ {(priceBreakdown.total / 100).toFixed(4)} SOL</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Special Requests (Optional)
              </label>
              <textarea
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                className="w-full p-2 border rounded-lg"
                rows={3}
                placeholder="Any special requests or dietary requirements?"
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
                {error.includes('connect your wallet') && !publicKey && (
                  <div className="mt-2 flex justify-center">
                    <button
                      type="button"
                      onClick={() => wallet.connect()}
                      className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <Image
                        src="/solana-logo.svg"
                        alt="Solana"
                        width={16}
                        height={16}
                        className="inline-block"
                      />
                      Connect Wallet
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isProcessing || (!publicKey && selectedDishes.length > 0)}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-500 text-white py-3 rounded-lg hover:from-purple-700 hover:to-blue-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={(e) => {
                if (!publicKey) {
                  e.preventDefault();
                  wallet.connect();
                }
              }}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing Solana Payment...
                </>
              ) : !publicKey ? (
                <>
                  Connect Wallet to Book
                </>
              ) : (
                <>
                  <Image
                    src="/solana-logo.svg"
                    alt="Solana"
                    width={20}
                    height={20}
                    className="inline-block"
                  />
                  Pay with Solana ({(priceBreakdown.total / 100).toFixed(4)} SOL)
                </>
              )}
            </button>
          </form>

          {transactionSignature && (
            <SuccessMessageBox
              restaurant={restaurant}
              bookingDetails={{
                date: selectedDate,
                time: selectedTime,
                guests,
                totalPrice: priceBreakdown.total,
                selectedDishes: selectedDishes,
              }}
              transactionSignature={transactionSignature}
              onClose={() => {
                setTransactionSignature(null);
                onClose();
              }}
            />
          )}
        </div>
      </div>
    </>
  );
} 