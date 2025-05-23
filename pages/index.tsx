import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { Star, MapPin, Clock, Phone, Calendar, Wallet, MessageSquare } from 'lucide-react';
import { useWallet, useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import dynamic from 'next/dynamic';
import BookingModal from '../components/BookingModal';
import { format } from 'date-fns';
import { getProgram, getRestaurantPublicKey, findUserStatsPDA } from '../utils/program';
import Header from '../components/Header';
import Link from 'next/link';
import { useRouter } from 'next/router';

// Dynamically import the wallet button component
const WalletMultiButtonDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

// Custom styles for the wallet button
const walletButtonStyles = {
  backgroundColor: 'transparent',
  border: 'none',
  padding: '0.5rem',
  borderRadius: '50%',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#4B5563',
  hover: {
    backgroundColor: '#F3F4F6',
    transform: 'scale(1.05)',
  },
};

// Sample restaurant data
const restaurants = [
  {
    id: 1,
    name: "Sushi Master",
    description: "Authentic Japanese cuisine with fresh ingredients and masterful preparation.",
    rating: 4.8,
    reviews: 234,
    cuisine: "Japanese",
    address: "123 Ocean Drive, San Francisco",
    hours: "11:00 AM - 10:00 PM",
    phone: "(555) 123-4567",
    image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=500&auto=format&fit=crop&q=60",
    individualReviews: [
      {
        id: 1,
        rating: 5,
        comment: "Amazing sushi! The quality is outstanding and the service is impeccable.",
        walletAddress: "7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh6UYBWwm6y1M",
        date: "2024-03-15"
      },
      {
        id: 2,
        rating: 4,
        comment: "Great atmosphere and delicious food. Will definitely come back!",
        walletAddress: "8x02N8jZ0nNjd9XgH7dhTDKjzSYzeRkMi7VZCxXn7z2N",
        date: "2024-03-14"
      }
    ]
  },
  {
    id: 2,
    name: "Pasta Paradise",
    description: "Traditional Italian pasta dishes made with homemade pasta and secret family recipes.",
    rating: 4.6,
    reviews: 189,
    cuisine: "Italian",
    address: "456 Main Street, San Francisco",
    hours: "12:00 PM - 11:00 PM",
    phone: "(555) 234-5678",
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&auto=format&fit=crop&q=60",
    individualReviews: [
      {
        id: 1,
        rating: 5,
        comment: "Best pasta I've ever had! The carbonara is to die for.",
        walletAddress: "9y13O9kA1oOkd0YhI8eiUELl0TZAfSlNj8WADyYo8A3O",
        date: "2024-03-15"
      }
    ]
  },
  {
    id: 3,
    name: "Burger Haven",
    description: "Gourmet burgers with locally sourced beef and artisanal buns.",
    rating: 4.5,
    reviews: 312,
    cuisine: "American",
    address: "789 Market Street, San Francisco",
    hours: "10:00 AM - 9:00 PM",
    phone: "(555) 345-6789",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60",
    individualReviews: [
      {
        id: 1,
        rating: 4,
        comment: "Great burgers and friendly staff. The craft beer selection is impressive.",
        walletAddress: "0z24P0lB2pPlf1ZiJ9fjVFMm1UaBgTmOk9XBEzZp9B4P",
        date: "2024-03-15"
      }
    ]
  },
  {
    id: 4,
    name: "Spice Garden",
    description: "Authentic Indian cuisine with a modern twist and extensive vegetarian options.",
    rating: 4.7,
    reviews: 156,
    cuisine: "Indian",
    address: "321 Curry Lane, San Francisco",
    hours: "11:30 AM - 10:30 PM",
    phone: "(555) 456-7890",
    image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=500&auto=format&fit=crop&q=60",
    individualReviews: []
  }
];

// Replace the helper function with the imported one from utils/program
// Create a helper for getting restaurant display name
const getRestaurantDisplayName = (restaurantId: number): string => {
  const publicKeyStr = getRestaurantPublicKey(restaurantId).toString();
  return `Restaurant #${publicKeyStr.slice(0, 6)}`;
};

export default function RatingApp() {
  const [mounted, setMounted] = useState(false);
  const [showPhantomLink, setShowPhantomLink] = useState(false);
  const { connection } = useConnection();
  const wallet = useWallet();
  const anchorWallet = useAnchorWallet();
  const { connected, publicKey } = wallet;
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<typeof restaurants[0] | null>(null);
  const [openReviews, setOpenReviews] = useState<{ [id: number]: boolean }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [program, setProgram] = useState<any>(null);
  const router = useRouter();

  // Track if the program is initialized
  const [programInitialized, setProgramInitialized] = useState(false);

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize Solana program when wallet connects
  useEffect(() => {
    if (connected && publicKey && anchorWallet && connection) {
      try {
        // Make sure the wallet is fully initialized with a valid public key
        if (!anchorWallet.publicKey) {
          console.error("Wallet connected but publicKey is not available yet");
          setProgramInitialized(false);
          return;
        }

        const solanaProgram = getProgram(anchorWallet, connection);
        setProgram(solanaProgram);
        setProgramInitialized(!!solanaProgram);

        if (solanaProgram) {
          console.log("Solana program initialized successfully");
          getUserData(solanaProgram);
        } else {
          console.error("Failed to initialize Solana program");
        }
      } catch (error) {
        console.error("Error initializing Solana program:", error);
        setProgramInitialized(false);
      }
    } else {
      setProgramInitialized(false);
    }
  }, [connected, publicKey, anchorWallet, connection]);

  // Function to fetch user data from the blockchain
  const getUserData = async (programInstance: any = program) => {
    if (!publicKey || !connection || !programInstance) return;

    setIsLoading(true);
    try {
      // Use the fetchUserData function from the program module
      const { fetchUserData } = require('../utils/program');
      const data = await fetchUserData(programInstance, connection, publicKey);

      if (data) {
        setUserData(data);
        console.log("User data loaded from blockchain:", data);
      } else {
        // Initialize empty user data structure if nothing found on chain
        setUserData({
          userPublicKey: publicKey.toString(),
          restaurants: {}
        });
        console.log("No existing user data found on blockchain");
      }
    } catch (error) {
      console.error("Error loading user data from blockchain:", error);
      // Set empty user data on error
      setUserData({
        userPublicKey: publicKey.toString(),
        restaurants: {}
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize user stats for a restaurant
  const handleInitializeUserStats = async (restaurantId: number) => {
    if (!publicKey || !program) return false;

    setBookingInProgress(true);

    try {
      // Create a deterministic PublicKey from the restaurant ID
      const restaurantPublicKey = getRestaurantPublicKey(restaurantId);
      console.log(`Initializing stats for restaurant: ${restaurantPublicKey.toString()}`);

      // Import the function from program module
      const { initializeUserStats } = require('../utils/program');

      // Call the function to initialize user stats
      try {
        const tx = await initializeUserStats(program, publicKey, restaurantPublicKey);
        console.log("User stats initialized successfully:", tx);

        // Refresh user data
        await getUserData();

        return true;
      } catch (e) {
        console.error("Specific error initializing user stats:", e);

        // Check if this is an "already initialized" error (which is actually okay)
        const errorMessage = e.toString();
        if (errorMessage.includes("already in use") || errorMessage.includes("already initialized")) {
          console.log("User stats already initialized, which is fine");
          return true; // Still return success in this case
        }

        throw new Error(`Failed to initialize user stats: ${e.message || e}`);
      }
    } catch (error) {
      console.error("Error initializing user stats:", error);
      alert(`Error initializing user stats: ${error.message || "Unknown error"}`);
      return false;
    } finally {
      setBookingInProgress(false);
    }
  };

  const handleBooking = async (restaurant: typeof restaurants[0]) => {
    if (!connected) {
      alert('Please connect your wallet to make a booking');
      return;
    }

    if (!programInitialized) {
      alert('Solana program not initialized yet. Please wait a moment and try again.');
      return;
    }

    try {
      setBookingInProgress(true);

      // Check if we need to initialize user stats first
      if (publicKey) {
        // Create a deterministic PublicKey from the restaurant ID
        const restaurantIdString = `restaurant-${restaurant.id}`;
        const restaurantIdBuffer = Buffer.from(restaurantIdString);
        const restaurantPublicKey = new PublicKey(restaurantIdBuffer);
        const restaurantKey = restaurantPublicKey.toBase58();

        // If we don't have user data yet, or we don't have data for this restaurant,
        // initialize user stats first
        if (!userData || !userData.restaurants[restaurantKey]) {
          console.log("Initializing user stats before booking");
          const initialized = await handleInitializeUserStats(restaurant.id);
          if (!initialized) {
            console.error("Failed to initialize user stats");
            return;
          }
        }
      }

      setSelectedRestaurant(restaurant);
      setIsBookingModalOpen(true);
    } catch (error) {
      console.error("Error during booking process:", error);
      alert(`Error during booking process: ${error.message || "Unknown error"}`);
    } finally {
      setBookingInProgress(false);
    }
  };

  const handleConfirmBooking = (bookingDetails: {
    date: Date;
    time: string;
    guests: number;
    specialRequests: string;
    selectedDishes: string[];
    totalPrice: number;
    transactionSignature?: string;
  }) => {
    console.log('Booking confirmed in parent (index.tsx):', {
      restaurant: selectedRestaurant?.name,
      ...bookingDetails,
    });

    if (bookingDetails.transactionSignature) {
      getUserData(); // Refresh user data, this is good
    }

    // DO NOT close the modal here. BookingModal will show SuccessMessageBox
    // and then handle its own closing via redirect or SuccessMessageBox's onClose prop.
    // setIsBookingModalOpen(false); // REMOVED
    // setSelectedRestaurant(null); // REMOVED (or move to BookingModal's main onClose if needed after redirect)

    // DO NOT show an alert here. SuccessMessageBox in BookingModal will handle UI.
    // const message = [ ... ].join('\n');
    // alert(message); // REMOVED
  };

  // If not mounted yet, don't render the page
  if (!mounted) return null;

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Head>
        <title>SolDine - Restaurant Booking & Rating</title>
        <meta name="description" content="Book tables and rate restaurants on Solana" />
        <link rel="icon" href="/favicon.ico" />
        <style jsx global>{`
          .wallet-adapter-button {
            background-color: transparent !important;
            border: none !important;
            padding: 0.5rem !important;
            border-radius: 50% !important;
            cursor: pointer !important;
            transition: all 0.2s ease !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            color: #4B5563 !important;
            min-width: 40px !important;
            height: 40px !important;
            font-size: 0 !important;
          }

          .wallet-adapter-button:hover {
            background-color: #F3F4F6 !important;
            transform: scale(1.05) !important;
          }

          .wallet-adapter-button-trigger {
            background-color: transparent !important;
          }

          .wallet-adapter-button:not([disabled]):hover {
            background-color: #F3F4F6 !important;
          }

          .wallet-adapter-modal-wrapper {
            background-color: white !important;
            border-radius: 1rem !important;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
          }

          .wallet-adapter-modal-button-close {
            background-color: transparent !important;
            border: none !important;
            padding: 0.5rem !important;
            border-radius: 50% !important;
            cursor: pointer !important;
            transition: all 0.2s ease !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            color: #4B5563 !important;
          }

          .wallet-adapter-modal-button-close:hover {
            background-color: #F3F4F6 !important;
          }
        `}</style>
      </Head>

      <Header />

      {/* Main Content Area */}
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Featured Restaurants</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {restaurants.map((restaurant) => (
            <div key={restaurant.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              <div className="relative h-48">
                <img
                  src={restaurant.image}
                  alt={restaurant.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 right-4 bg-white px-3 py-1 rounded-full flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="font-semibold">{restaurant.rating}</span>
                </div>
              </div>

              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{restaurant.name}</h2>
                <p className="text-gray-600 mb-4">{restaurant.description}</p>

                <div className="space-y-2 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{restaurant.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{restaurant.hours}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>{restaurant.phone}</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-gray-500">{restaurant.reviews} reviews</span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                    {restaurant.cuisine}
                  </span>
                </div>

                <div className="mt-6 flex gap-2">
                  <button
                    onClick={() => handleBooking(restaurant)}
                    disabled={bookingInProgress}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                    style={{ minWidth: 0 }}
                  >
                    <Calendar className="w-4 h-4" />
                    {connected ? (bookingInProgress ? 'Processing...' : 'Book') : 'Connect'}
                  </button>
                  <Link href={`/rating/${restaurant.id}`} passHref legacyBehavior>
                    <a className="flex-1 flex items-center justify-center gap-2 bg-gray-200 text-gray-800 px-3 py-2 rounded-lg text-sm hover:bg-gray-300 transition-colors" style={{ minWidth: 0 }}>
                      <MessageSquare className="w-4 h-4" />
                      Rate / Reviews
                    </a>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Booking Modal */}
      {selectedRestaurant && (
        <BookingModal
          isOpen={isBookingModalOpen}
          onClose={() => {
            setIsBookingModalOpen(false);
            setSelectedRestaurant(null);
          }}
          restaurant={selectedRestaurant}
          onConfirm={handleConfirmBooking}
        />
      )}
    </div>
  );
} 