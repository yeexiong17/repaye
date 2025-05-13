import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Star, MapPin, Clock, Phone, Calendar, Wallet } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
import BookingModal from '../components/BookingModal';
import { format } from 'date-fns';

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

export default function RatingApp() {
  const [mounted, setMounted] = useState(false);
  const [showPhantomLink, setShowPhantomLink] = useState(false);
  const { connected } = useWallet();
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<typeof restaurants[0] | null>(null);
  const [openReviews, setOpenReviews] = useState<{ [id: number]: boolean }>({});
  
  // Handle client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if Phantom wallet is installed
  useEffect(() => {
    if (!mounted) return;

    const checkPhantomWallet = () => {
      const isPhantomInstalled = window?.solana?.isPhantom;
      setShowPhantomLink(!isPhantomInstalled);
    };
    
    checkPhantomWallet();
    window.addEventListener('load', checkPhantomWallet);
    
    return () => {
      window.removeEventListener('load', checkPhantomWallet);
    };
  }, [mounted]);

  const handleBooking = (restaurant: typeof restaurants[0]) => {
    if (!connected) {
      alert('Please connect your wallet to make a booking');
      return;
    }
    setSelectedRestaurant(restaurant);
    setIsBookingModalOpen(true);
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
    // Here you would typically send the booking details to your backend
    console.log('Booking confirmed:', {
      restaurant: selectedRestaurant?.name,
      ...bookingDetails,
    });
    
    const message = [
      `Booking confirmed at ${selectedRestaurant?.name}`,
      `Date: ${format(bookingDetails.date, 'MMMM d, yyyy')}`,
      `Time: ${bookingDetails.time}`,
      `Guests: ${bookingDetails.guests}`,
      `Selected Dishes: ${bookingDetails.selectedDishes.join(', ')}`,
      `Total Price: $${bookingDetails.totalPrice.toFixed(2)}`,
      bookingDetails.transactionSignature ? 
        `Transaction: https://explorer.solana.com/tx/${bookingDetails.transactionSignature}` : 
        'No transaction signature'
    ].join('\n');

    alert(message);
    setIsBookingModalOpen(false);
    setSelectedRestaurant(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Restaurant Reviews - Solana</title>
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

      {/* Wallet Connection Section - Fixed in top right */}
      <div className="fixed top-4 right-4 z-50">
        {mounted && (
          <div className="flex flex-col items-end gap-2">
            <div className="relative">
              <WalletMultiButtonDynamic />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Wallet className="w-5 h-5 text-gray-600" />
              </div>
            </div>
            {showPhantomLink && (
              <div className="text-right">
                <p className="text-sm text-gray-600 mb-2">Don't have Phantom wallet?</p>
                <a
                  href="https://phantom.app/download"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Download Phantom Wallet
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
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
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                    style={{ minWidth: 0 }}
                  >
                    <Calendar className="w-4 h-4" />
                    {connected ? 'Book' : 'Connect'}
                  </button>
                  <button
                    onClick={() =>
                      setOpenReviews((prev) => ({
                        ...prev,
                        [restaurant.id]: !prev[restaurant.id],
                      }))
                    }
                    className="flex-1 flex items-center justify-center gap-2 bg-gray-200 text-gray-800 px-3 py-2 rounded-lg text-sm hover:bg-gray-300 transition-colors"
                    style={{ minWidth: 0 }}
                  >
                    Reviews
                  </button>
                </div>

                {openReviews[restaurant.id] && restaurant.individualReviews && restaurant.individualReviews.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-lg font-semibold mb-2 text-gray-800">Reviews</h3>
                    <div className="space-y-3">
                      {restaurant.individualReviews.slice(-2).reverse().map((review) => (
                        <div key={review.id} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-4 h-4 ${
                                      star <= review.rating
                                        ? 'text-yellow-400 fill-yellow-400'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-xs text-gray-500">{review.date}</span>
                            </div>
                            <span className="text-xs text-gray-400">
                              {review.walletAddress.slice(0, 4)}...{review.walletAddress.slice(-4)}
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm">{review.comment}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

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