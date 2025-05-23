import { useState, useEffect } from 'react';
import { useWallet, useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import Link from 'next/link';
import Image from 'next/image';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Loader2, Calendar, AlertCircle, ChefHat, Home, ShoppingCart } from 'lucide-react';
import { getProgram, fetchUserData } from '../utils/program';
import Header from '../components/Header';

// Define interfaces
interface DisplayedRestaurant {
    id: string; // This will be the actual restaurant PublicKey string
    name: string; // Derived name (e.g., "Restaurant #ABCDEF")
    visitCount: number;
    userStatsPda: string;
}

interface AggregatedDish {
    name: string;
    count: number; // Total times this dish name was ordered by the user
    pubkeys: string[]; // DishStats PDAs for this dish name
    dishPks: string[]; // Original dish.publicKey for this dish name
}

// The OnChainBooking interface might be less directly used if we separate concerns,
// but we can adapt what is stored in the main 'bookings' state.
// For now, let's rename 'bookings' state to 'restaurantVisits'

export default function BookingsPage() {
    const { connection } = useConnection();
    const wallet = useWallet();
    const { publicKey } = wallet;
    const anchorWallet = useAnchorWallet();

    // State for restaurant visits
    const [restaurantVisits, setRestaurantVisits] = useState<DisplayedRestaurant[]>([]);
    // State for all dishes ordered by the user
    const [allUserDishes, setAllUserDishes] = useState<AggregatedDish[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [programInitialized, setProgramInitialized] = useState(false);

    useEffect(() => {
        const loadOnChainData = async () => {
            setLoading(true);
            setError(null);

            if (!publicKey || !anchorWallet || !connection) {
                setLoading(false);
                return;
            }

            try {
                if (!anchorWallet.publicKey) {
                    console.error("BookingsPage: AnchorWallet connected but publicKey is not available yet");
                    setProgramInitialized(false);
                    setLoading(false);
                    return;
                }

                const program = getProgram(anchorWallet, connection);
                if (!program) {
                    setError("Failed to initialize Solana program. Check console for details.");
                    setProgramInitialized(false);
                    setLoading(false);
                    return;
                }
                setProgramInitialized(true);

                // Fetch processed user data
                const processedUserData = await fetchUserData(program, connection, publicKey);

                if (!processedUserData) {
                    setRestaurantVisits([]);
                    setAllUserDishes([]);
                    setLoading(false);
                    return;
                }

                // Transform restaurants data
                const visits: DisplayedRestaurant[] = Object.entries(processedUserData.restaurants || {}).map(
                    ([restaurantPk, restaurantData]) => {
                        const shortId = restaurantPk.slice(0, 6);
                        const restaurantName = `Restaurant #${shortId}`;
                        return {
                            id: restaurantPk,
                            name: restaurantName,
                            visitCount: restaurantData.visitCount || 0,
                            userStatsPda: restaurantData.userStatsPda,
                        };
                    }
                );
                setRestaurantVisits(visits);

                // Transform allUserDishes data
                const dishes: AggregatedDish[] = Object.values(processedUserData.allUserDishes || {});
                setAllUserDishes(dishes);

                if (visits.length === 0 && dishes.length === 0) {
                    console.log("BookingsPage: No on-chain data found for this wallet");
                } else {
                    console.log(`BookingsPage: Found ${visits.length} restaurant visits and ${dishes.length} unique dish types.`);
                }

            } catch (err) {
                console.error('BookingsPage: Error loading on-chain data:', err);
                setError(`Error loading blockchain data: ${err instanceof Error ? err.message : String(err)}`);
                setProgramInitialized(false);
            } finally {
                setLoading(false);
            }
        };

        loadOnChainData();
    }, [publicKey, connection, anchorWallet]);

    const hasBookings = restaurantVisits.length > 0 || allUserDishes.length > 0;

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />
            <main className="flex-grow">
                <div className="max-w-4xl mx-auto px-4 py-8">
                    <h1 className="text-3xl font-bold mb-8">Your On-Chain Activity</h1>

                    {!publicKey && (
                        <div className="bg-blue-50 p-6 rounded-lg mb-8 text-center">
                            <AlertCircle className="h-10 w-10 text-blue-500 mx-auto mb-2" />
                            <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
                            <p className="text-gray-600 mb-4">
                                Connect your Solana wallet to view your booking history stored on the blockchain
                            </p>
                            <button
                                onClick={() => wallet.connect()}
                                className="bg-blue-500 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 mx-auto hover:bg-blue-600 transition-colors"
                            >
                                <Image src="/solana-logo.svg" alt="Solana" width={16} height={16} />
                                Connect Wallet
                            </button>
                        </div>
                    )}

                    {publicKey && !programInitialized && !loading && (
                        <div className="bg-yellow-50 p-6 rounded-lg mb-8">
                            <h2 className="text-xl font-semibold mb-2">Program Initialization Error</h2>
                            <p className="text-gray-700 mb-4">
                                Could not initialize the Solana program. This might be due to network issues or
                                incorrect program configuration.
                            </p>
                            <p className="text-sm text-gray-500">
                                Check the browser console for more details.
                            </p>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-60">
                            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                            <p className="text-gray-500">Fetching your bookings from the Solana blockchain...</p>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 p-6 rounded-lg text-red-700 mb-6">
                            <AlertCircle className="h-6 w-6 mb-2" />
                            <p>{error}</p>
                        </div>
                    ) : null}

                    {!hasBookings && publicKey && !loading && !error && (
                        <div className="text-center py-12 bg-gray-50 rounded-lg">
                            <ChefHat className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                            <h3 className="text-xl font-medium mb-2">No on-chain activity found</h3>
                            <p className="text-gray-500 mb-6">We couldn't find any restaurant visits or dishes ordered for your wallet on the blockchain</p>
                            <Link href="/" className="bg-blue-500 text-white py-2 px-6 rounded-lg hover:bg-blue-600 transition-colors">
                                Explore Restaurants
                            </Link>
                        </div>
                    )}

                    {restaurantVisits.length > 0 && publicKey && !loading && !error && (
                        <div className="mb-12">
                            <h2 className="text-2xl font-semibold mb-6 flex items-center">
                                <Calendar className="mr-2 h-6 w-6 text-indigo-600" />
                                Restaurant Visits
                            </h2>
                            <div className="space-y-6">
                                {restaurantVisits.map((visit) => (
                                    <div key={visit.userStatsPda} className="bg-white shadow rounded-lg overflow-hidden border border-gray-100">
                                        <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-4">
                                            <h3 className="text-xl font-bold">{visit.name}</h3>
                                            <div className="flex items-center text-sm opacity-90 mt-1">
                                                <span className="bg-white bg-opacity-20 px-2 py-0.5 rounded-full">
                                                    {visit.visitCount} {visit.visitCount === 1 ? 'visit' : 'visits'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="p-6">
                                            <p className="text-gray-700">
                                                Restaurant ID (PK): <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{visit.id}</span>
                                            </p>
                                            <p className="text-gray-500 text-xs mt-1">
                                                UserStats PDA: <span className="font-mono">{visit.userStatsPda}</span>
                                            </p>
                                            {/* Removed direct dish listing here, as it's now global */}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {allUserDishes.length > 0 && publicKey && !loading && !error && (
                        <div>
                            <h2 className="text-2xl font-semibold mb-6 flex items-center">
                                <ShoppingCart className="mr-2 h-6 w-6 text-green-600" />
                                All Dishes You've Ordered
                            </h2>
                            <div className="bg-white shadow rounded-lg border border-gray-100 p-6">
                                <div className="space-y-3">
                                    {allUserDishes.map((dish, index) => (
                                        <div key={index} className="flex justify-between items-center py-2 border-b last:border-0 border-gray-200">
                                            <div className="flex items-center">
                                                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                                                <span className="font-medium">{dish.name}</span>
                                            </div>
                                            <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
                                                {dish.count}x total ordered
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {allUserDishes.length > 5 && (
                                    <p className="text-xs text-gray-400 mt-4 text-center">
                                        Showing aggregated counts for all dishes linked to your wallet.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {(restaurantVisits.length > 0 || allUserDishes.length > 0) && publicKey && !loading && !error && (
                        <div className="border-t pt-6 mt-10 text-center">
                            <p className="text-sm text-gray-700">
                                This data was fetched directly from the Solana blockchain.
                            </p>
                        </div>
                    )}

                </div>
            </main>
            <footer className="bg-white border-t border-gray-200 mt-auto">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <div className="flex items-center mb-4 md:mb-0">
                            <Image
                                src="/solana-logo.svg"
                                alt="Repaye Logo"
                                width={24}
                                height={24}
                                className="mr-2"
                            />
                            <span className="font-semibold text-gray-800">Repaye</span>
                            <span className="text-gray-500 ml-2 text-sm">© {new Date().getFullYear()}</span>
                        </div>
                        <div className="flex space-x-6">
                            <a href="#" className="text-gray-500 hover:text-gray-700">
                                About
                            </a>
                            <a href="#" className="text-gray-500 hover:text-gray-700">
                                Terms
                            </a>
                            <a href="#" className="text-gray-500 hover:text-gray-700">
                                Privacy
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
} 