import { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, Clock, X, DollarSign, Loader2, CheckCircle2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import Image from 'next/image';
import { useRouter } from 'next/router';
import SuccessMessageBox from './SuccessMessageBox';

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
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [guests, setGuests] = useState(2);
  const [specialRequests, setSpecialRequests] = useState("");
  const [selectedDishes, setSelectedDishes] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionSignature, setTransactionSignature] = useState<string | null>(null);

  // Calculate total price
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

      // Validate wallet address
      try {
        new PublicKey(RESTAURANT_WALLET);
      } catch (err) {
        throw new Error('Invalid restaurant wallet address');
      }

      // Check user's balance
      const balance = await connection.getBalance(publicKey);
      const SOL_PRICE_USD = 100; // Mock price: $100 per SOL
      const solAmount = priceBreakdown.total / SOL_PRICE_USD;
      const requiredLamports = Math.floor(solAmount * LAMPORTS_PER_SOL);

      if (balance < requiredLamports) {
        throw new Error(`Insufficient balance. Required: ${solAmount.toFixed(4)} SOL`);
      }

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

      // Create transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(RESTAURANT_WALLET),
          lamports: requiredLamports,
        })
      );

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Send transaction
      const signature = await sendTransaction(transaction, connection);
      
      // Wait for confirmation with timeout
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

        if (confirmation.value.err) {
          throw new Error('Transaction failed to confirm');
        }

        // Set transaction signature
        setTransactionSignature(signature);

        // Proceed with booking
        onConfirm({
          date: selectedDate,
          time: selectedTime,
          guests,
          specialRequests,
          selectedDishes,
          totalPrice: priceBreakdown.total,
          transactionSignature: signature,
        });

        // Redirect to rating page after 3 seconds
        setTimeout(() => {
          router.push(`/rating/${restaurant.id}?tx=${signature}`);
        }, 3000);

      } catch (confirmError) {
        // If we have a signature but confirmation timed out, show a special message
        if (confirmError.message === 'Transaction timeout') {
          setError(
            `Transaction sent but confirmation pending. Please check the status using the Solana Explorer: ` +
            `https://explorer.solana.com/tx/${signature}`
          );
          
          // Still proceed with the booking since the transaction might succeed
          onConfirm({
            date: selectedDate,
            time: selectedTime,
            guests,
            specialRequests,
            selectedDishes,
            totalPrice: priceBreakdown.total,
            transactionSignature: signature,
          });

          // Redirect to rating page after 3 seconds
          setTimeout(() => {
            router.push(`/rating/${restaurant.id}?tx=${signature}`);
          }, 3000);
        } else {
          throw confirmError;
        }
      }

    } catch (err) {
      console.error('Payment failed:', err);
      setError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handlePayment();
  };

  const toggleDish = (dish: string) => {
    setSelectedDishes(prev =>
      prev.includes(dish)
        ? prev.filter(d => d !== dish)
        : [...prev, dish]
    );
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

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date Selection */}
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

            {/* Time Selection */}
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
                    className={`p-2 rounded-lg border ${
                      selectedTime === time
                        ? 'bg-blue-500 text-white'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            {/* Number of Guests */}
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

            {/* Pre-order Dishes */}
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

            {/* Price Breakdown */}
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

            {/* Special Requests */}
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

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-500 text-white py-3 rounded-lg hover:from-purple-700 hover:to-blue-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing Solana Payment...
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
        </div>
      </div>

      {transactionSignature && (
        <SuccessMessageBox
          restaurant={restaurant}
          bookingDetails={{
            date: selectedDate,
            time: selectedTime,
            guests,
            totalPrice: priceBreakdown.total,
          }}
          transactionSignature={transactionSignature}
          onClose={() => {
            setTransactionSignature(null);
            onClose();
          }}
        />
      )}
    </>
  );
} 