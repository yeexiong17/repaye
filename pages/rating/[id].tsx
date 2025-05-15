import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Star, ExternalLink, ArrowLeft } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Connection } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import idl from '../../idl/restaurant_booking.json';
import {
  submitReview,
  fetchReviewsForRestaurant,
  fetchUserReviewForRestaurant,
  findReviewPDA,
  ProcessedReview as ProgramProcessedReview,
  fetchUserStatsForSingleRestaurant,
} from '../../utils/program';
import Header from '../../components/Header';
import { PROGRAM_ID_PK, RESTAURANTS_DATA } from '../../utils/constants';

// This type alias is for our reference for the IDL structure
type RestaurantBookingIdlSchema = typeof idl;

interface Review extends ProgramProcessedReview { }

export default function RatingPage() {
  const router = useRouter();
  const { id, tx, promptReview } = router.query;
  const wallet = useWallet();
  const { publicKey } = wallet;

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [visitCount, setVisitCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);

  // program and setProgram should be defined only once here
  const [program, setProgram] = useState<Program | null>(null);
  const [allReviews, setAllReviews] = useState<Review[]>([]);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [error, setError] = useState<string | null>(null);

  const routeId = typeof id === 'string' ? parseInt(id, 10) : -1;
  const restaurantData = RESTAURANTS_DATA.find(r => r.id === routeId);
  const restaurantName = restaurantData?.name || "Unknown Restaurant";
  const restaurantPublicKey = restaurantData?.publicKey;

  useEffect(() => {
    const rpcHost = process.env.NEXT_PUBLIC_SOLANA_RPC_HOST || 'https://api.devnet.solana.com';
    if (wallet.connected && wallet.publicKey) {
      const connection = new Connection(rpcHost, 'confirmed');
      const provider = new AnchorProvider(connection, wallet as any, AnchorProvider.defaultOptions());
      const prog = new Program(idl as any, PROGRAM_ID_PK, provider);
      setProgram(prog);
      setError(null);
    } else {
      setProgram(null);
      if (!process.env.NEXT_PUBLIC_SOLANA_RPC_HOST) {
        console.warn(
          `NEXT_PUBLIC_SOLANA_RPC_HOST is not set. Defaulting to public Devnet RPC: ${rpcHost}. ` +
          `It is recommended to set this in your .env.local file for better control and reliability.`
        );
      }
    }
  }, [wallet.connected, wallet.publicKey]);

  useEffect(() => {
    const fetchReviewsAndHandlePrompt = async () => {
      if (!program || !restaurantPublicKey) {
        if (routeId !== -1 && !restaurantPublicKey) {
          setError(`Restaurant with ID ${routeId} not found in constants or has no PublicKey.`);
          setIsLoadingReviews(false);
        }
        return;
      }
      setIsLoadingReviews(true);
      setError(null);
      try {
        const fetchedRawReviews = await fetchReviewsForRestaurant(program, restaurantPublicKey);
        setAllReviews(fetchedRawReviews.map((r: ProgramProcessedReview) => ({ ...r })));

        let fetchedUserRev = null;
        if (publicKey) {
          fetchedUserRev = await fetchUserReviewForRestaurant(program, publicKey, restaurantPublicKey);
          if (fetchedUserRev) {
            const formattedUserReview: Review = { ...fetchedUserRev };
            setUserReview(formattedUserReview);
            setRating(formattedUserReview.rating);
            setComment(formattedUserReview.reviewText);
          } else {
            setUserReview(null);
            setRating(0);
            setComment('');
            const stats = await fetchUserStatsForSingleRestaurant(program, publicKey, restaurantPublicKey);
            setVisitCount(stats?.visitCount || 0);
          }
        }
        // Determine if review form should be shown AFTER fetching user's review status
        if (promptReview === 'true' && !fetchedUserRev && publicKey) {
          setShowReviewForm(true);
        } else {
          setShowReviewForm(false);
        }

      } catch (e: any) {
        console.error("Error fetching reviews:", e);
        setError(`Failed to load reviews: ${e.message || 'Unknown error'}`);
      } finally {
        setIsLoadingReviews(false);
      }
    };
    if (restaurantPublicKey) { fetchReviewsAndHandlePrompt(); }
    else if (routeId === -1 && id) {
      setError("Invalid restaurant ID in URL.");
      setIsLoadingReviews(false);
    } else if (!restaurantData && routeId !== -1) {
      setError(`Restaurant with ID ${routeId} not found.`);
      setIsLoadingReviews(false);
    }
  }, [program, restaurantPublicKey, publicKey, routeId, id, promptReview]);

  const handleRatingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey || !program || !restaurantPublicKey) {
      alert('Please connect your wallet and ensure program & restaurant ID are valid.');
      return;
    }
    if (rating === 0) { alert('Please select a rating.'); return; }
    if (comment.trim() === '') { alert('Please enter a review comment.'); return; }
    // Do not check for userReview here, as this form is only shown if userReview is null AND promptReview is true
    // if (userReview) { alert('You have already reviewed this restaurant.'); return; }

    setIsSubmitting(true);
    setError(null);
    let finalConfidenceLevel = 5;

    try {
      // Fetch visit count again just before submission, though it might have been fetched earlier
      if (publicKey && program && restaurantPublicKey) {
        const stats = await fetchUserStatsForSingleRestaurant(program, publicKey, restaurantPublicKey);
        setVisitCount(stats?.visitCount || 0);
      }

      const apiResponse = await fetch('/api/calculate-confidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewText: comment,
          starRating: rating,
          visitCount: visitCount, // Use the potentially updated visitCount
        }),
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.error || `API error: ${apiResponse.status}`);
      }

      const responseData = await apiResponse.json();
      finalConfidenceLevel = responseData.calculatedConfidenceLevel || 5;

      const txSignature = await submitReview(
        program,
        publicKey,
        restaurantPublicKey,
        rating,
        comment,
        finalConfidenceLevel
      );

      alert('Thank you for your review! Transaction: ' + txSignature);

      const reviewPda = findReviewPDA(program, publicKey, restaurantPublicKey);
      const newReview: Review = {
        publicKey: reviewPda,
        user: publicKey,
        restaurant: restaurantPublicKey,
        rating: rating,
        reviewText: comment,
        confidenceLevel: finalConfidenceLevel,
      };
      setAllReviews(prevReviews => [newReview, ...prevReviews].sort((a, b) => b.rating - a.rating));
      setUserReview(newReview);
      setShowReviewForm(false); // Hide form after successful submission
      // Remove promptReview from URL query params to prevent re-showing form on refresh
      const { pathname, query } = router;
      delete query.promptReview;
      router.replace({ pathname, query }, undefined, { shallow: true });

    } catch (error: any) {
      console.error('Error submitting review page-side:', error, error.message);
      if (error.message === "TRANSACTION_ALREADY_PROCESSED") {
        alert('Review submission is processing or may have already completed. Please refresh the page in a moment to see your review.');
      } else {
        setError(`Failed to submit review: ${error.message || 'Please try again.'}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-8"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </button>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {showReviewForm ? 'Leave a Review' : `Customer Reviews for ${restaurantName}`}
              </h1>
              <p className="text-gray-600">
                {showReviewForm ? `Share your experience at ${restaurantName} after your recent booking.` : `Read what others are saying about ${restaurantName}.`}
              </p>
              {userReview && (
                <div className="my-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-green-700 font-semibold">
                    You have already submitted a review for this restaurant.
                  </p>
                  <div className="mt-2">
                    <h3 className="text-md font-semibold text-gray-800">Your Review:</h3>
                    <div className="flex items-center gap-1 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={`user-review-star-${i}`}
                          className={`w-5 h-5 ${i < userReview.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                    <p className="text-gray-600 mt-1 break-words">{userReview.reviewText}</p>
                    {typeof userReview.confidenceLevel === 'number' && (
                      <span className="mt-1 text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full inline-block">
                        AI Confidence: {userReview.confidenceLevel}/10
                      </span>
                    )}
                  </div>
                </div>
              )}
              {error && <p className="my-4 text-red-500 bg-red-50 p-3 rounded-md">{error}</p>}
            </div>

            {tx && (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <h2 className="text-lg font-semibold mb-2">Booking Transaction Confirmed</h2>
                <div className="flex items-center gap-2">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                    {tx.toString().slice(0, 8)}...{tx.toString().slice(-8)}
                  </code>
                  <a
                    href={`https://explorer.solana.com/tx/${tx}${process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'devnet' ? '?cluster=devnet' : ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-600"
                  >
                    <ExternalLink className="w-4 h-4" /> View on Explorer
                  </a>
                </div>
              </div>
            )}

            {showReviewForm && publicKey && program && (
              <form onSubmit={handleRatingSubmit} className="space-y-6 mb-12 border-t border-b py-8 my-8">
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
                          className={`w-8 h-8 ${star <= (hoverRating || rating)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300'
                            }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="review-comment" className="block text-sm font-medium text-gray-700 mb-2">
                    Your Review Comment
                  </label>
                  <textarea
                    id="review-comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={4}
                    placeholder="Share your experience..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || rating === 0 || comment.trim() === '' || !publicKey || !program || isLoadingReviews}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Your Review'}
                </button>
              </form>
            )}

            <div className="mt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {allReviews.length > 0 || isLoadingReviews ? (showReviewForm ? "Other Customer Reviews" : "All Customer Reviews") : "No Reviews Yet"}
              </h2>
              {isLoadingReviews && <div className="text-center py-4">Loading reviews...</div>}
              {!isLoadingReviews && !error && allReviews.length === 0 &&
                (publicKey && program && !showReviewForm ?
                  <p>No reviews yet. Be the first to review after your next visit!</p>
                  : <p>No reviews yet for {restaurantName}.</p>)
              }
              <div className="space-y-6">
                {allReviews
                  .filter(review => !(userReview && review.publicKey.equals(userReview.publicKey)))
                  .map((review, index) => (
                    <div key={review.publicKey?.toString() || `review-${index}`} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-5 h-5 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                              />
                            ))}
                          </div>
                          {typeof review.confidenceLevel === 'number' && (
                            <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                              AI Confidence: {review.confidenceLevel}/10
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-700 mb-1 break-words">
                        {review.reviewText}
                      </p>
                      <p className="text-xs text-gray-500">
                        By: {review.user.toString().slice(0, 6)}...{review.user.toString().slice(-6)}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 