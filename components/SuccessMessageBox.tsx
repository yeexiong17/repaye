import { CheckCircle2, ExternalLink, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface SuccessMessageBoxProps {
  restaurant: {
    name: string;
  };
  bookingDetails: {
    date: Date;
    time: string;
    guests: number;
    totalPrice: number;
    selectedDishes: string[];
  };
  transactionSignature: string;
  onClose: () => void;
}

export default function SuccessMessageBox({
  restaurant,
  bookingDetails,
  transactionSignature,
  onClose,
}: SuccessMessageBoxProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl transform transition-all">
        <div className="flex justify-end mb-4">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
          </div>
          <h3 className="text-3xl font-bold text-gray-900 mb-3">Booking Successful!</h3>
          <p className="text-gray-600 text-lg">Your booking has been confirmed.</p>
        </div>

        <div className="bg-gray-50 rounded-xl p-6 mb-6 border border-gray-100">
          <h4 className="text-xl font-semibold mb-4 text-gray-800">Transaction Details</h4>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Transaction ID:</span>
              <div className="flex items-center gap-2">
                <code className="bg-blue-100 px-3 py-1.5 rounded-lg font-mono text-xs">
                  {transactionSignature.slice(0, 8)}...{transactionSignature.slice(-8)}
                </code>
                <a
                  href={`https://explorer.solana.com/tx/${transactionSignature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-600 transition-colors"
                  title="View on Solana Explorer"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Amount Paid:</span>
              <span className="font-medium">${bookingDetails.totalPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="font-medium text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Confirmed
              </span>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-xl p-6 mb-6 border border-blue-100">
          <h4 className="text-xl font-semibold mb-4 text-gray-800">Booking Details</h4>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Restaurant:</span>
              <span className="font-medium">{restaurant.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Date:</span>
              <span className="font-medium">{format(bookingDetails.date, 'MMMM d, yyyy')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Time:</span>
              <span className="font-medium">{bookingDetails.time}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Guests:</span>
              <span className="font-medium">{bookingDetails.guests} people</span>
            </div>
            {bookingDetails.selectedDishes && bookingDetails.selectedDishes.length > 0 && (
              <div className="flex justify-between items-start">
                <span className="text-gray-600">Selected Dishes:</span>
                <span className="font-medium text-right">
                  {bookingDetails.selectedDishes.join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="text-center bg-gray-50 rounded-xl p-4 border border-gray-100">
          <div className="flex items-center justify-center gap-2 text-gray-600 mb-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="font-medium">Waiting to navigate to the rating page…</span>
          </div>
          <p className="text-sm text-gray-500">
            You will be redirected to the rating page in a few seconds.
          </p>
        </div>
      </div>
    </div>
  );
} 