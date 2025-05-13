import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Star, ExternalLink, ArrowLeft } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';

// Sample restaurant data (in production, fetch from your backend)
const restaurants = [
  {
    id: 1,
    name: "Sushi Master",
    description: "Experience authentic Japanese cuisine with our master chefs. Fresh ingredients and traditional techniques create an unforgettable dining experience.",
    address: "123 Ocean Drive, Miami Beach",
    hours: "Mon-Sun: 11:00 AM - 10:00 PM",
    phone: "(305) 123-4567",
    reviews: 128,
    cuisine: "Japanese",
    rating: 4.8,
    image: "/restaurants/sushi-master.jpg",
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
    description: "Italian culinary excellence in the heart of the city. Handmade pasta, authentic recipes, and a cozy atmosphere make every visit special.",
    address: "456 Main Street, Downtown",
    hours: "Mon-Sat: 12:00 PM - 11:00 PM, Sun: 12:00 PM - 9:00 PM",
    phone: "(305) 234-5678",
    reviews: 95,
    cuisine: "Italian",
    rating: 4.6,
    image: "/restaurants/pasta-paradise.jpg",
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
    description: "Gourmet burgers and craft beers in a casual setting. Our signature burgers are made with premium ingredients and served with a side of happiness.",
    address: "789 Food Court, Shopping Mall",
    hours: "Mon-Sun: 10:00 AM - 11:00 PM",
    phone: "(305) 345-6789",
    reviews: 210,
    cuisine: "American",
    rating: 4.5,
    image: "/restaurants/burger-haven.jpg",
    individualReviews: [
      {
        id: 1,
        rating: 4,
        comment: "Great burgers and friendly staff. The craft beer selection is impressive.",
        walletAddress: "0z24P0lB2pPlf1ZiJ9fjVFMm1UaBgTmOk9XBEzZp9B4P",
        date: "2024-03-15"
      }
    ]
  }
];

export default function RatingPage() {
  const router = useRouter();
  const { id, tx } = router.query;
  const { publicKey } = useWallet();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get the actual restaurant data
  const restaurant = restaurants.find(r => r.id === Number(id)) || {
    id: id,
    name: "Unknown Restaurant",
    cuisine: "Unknown",
    individualReviews: [],
  };

  const handleRatingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey) {
      alert('Please connect your wallet to submit a rating');
      return;
    }

    setIsSubmitting(true);
    try {
      // Update the restaurant's reviews and rating
      const restaurantIndex = restaurants.findIndex(r => r.id === Number(id));
      if (restaurantIndex !== -1) {
        const restaurant = restaurants[restaurantIndex];
        const newReviews = restaurant.reviews + 1;
        const newRating = ((restaurant.rating * restaurant.reviews) + rating) / newReviews;
        
        // Create new review object
        const newReview = {
          id: restaurant.individualReviews.length + 1,
          rating,
          comment,
          walletAddress: publicKey.toString(),
          date: new Date().toISOString().split('T')[0]
        };
        
        // Update the restaurant data
        restaurants[restaurantIndex] = {
          ...restaurant,
          reviews: newReviews,
          rating: Number(newRating.toFixed(1)),
          individualReviews: [...restaurant.individualReviews, newReview]
        };

        // Here you would typically send the rating to your backend
        console.log('Rating submitted:', {
          restaurantId: id,
          rating,
          comment,
          walletAddress: publicKey.toString(),
          transactionId: tx,
          newRating,
          newReviews
        });
      }

      // Show success message and redirect back to home
      alert('Thank you for your rating!');
      router.push('/');
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('Failed to submit rating. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-8"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Restaurants
        </button>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Rate Your Experience
            </h1>
            <p className="text-gray-600">
              How was your experience at {restaurant.name}?
            </p>
          </div>

          {tx && (
            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
              <h2 className="text-lg font-semibold mb-2">Transaction Details</h2>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                  {tx.toString().slice(0, 8)}...{tx.toString().slice(-8)}
                </code>
                <a
                  href={`https://explorer.solana.com/tx/${tx}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-600"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}

          <form onSubmit={handleRatingSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Rating
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= (hoverRating || rating)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Review
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                placeholder="Share your experience..."
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || rating === 0}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Rating'}
            </button>
          </form>

          {/* Reviews Section */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Customer Reviews</h2>
            <div className="space-y-6">
              {restaurant.individualReviews.map((review) => (
                <div key={review.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
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
                      <span className="text-sm text-gray-500">{review.date}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {review.walletAddress.slice(0, 4)}...{review.walletAddress.slice(-4)}
                    </div>
                  </div>
                  <p className="text-gray-700">{review.comment}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 