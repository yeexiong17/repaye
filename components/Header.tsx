import Link from 'next/link';
import Image from 'next/image';
// import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'; // Removed direct import
import { Home, Calendar } from 'lucide-react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic'; // Added dynamic import

// Dynamically import WalletMultiButton with SSR turned off
const WalletMultiButtonDynamic = dynamic(
    async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
    { ssr: false }
);

export default function Header() {
    const pathname = usePathname();

    return (
        <header className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        {/* Desktop navigation links */}
                        <nav className="hidden sm:ml-6 sm:flex sm:space-x-8">
                            <Link href="/" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${pathname === '/' ? 'border-indigo-500 text-indigo-600' : 'border-transparent hover:border-gray-300'}`}>
                                <Home className="mr-1 h-4 w-4" />
                                Home
                            </Link>
                            <Link href="/bookings" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${pathname === '/bookings' ? 'border-indigo-500 text-indigo-600' : 'border-transparent hover:border-gray-300'}`}>
                                <Calendar className="mr-1 h-4 w-4" />
                                My Bookings
                            </Link>
                        </nav>
                    </div>

                    {/* Wallet button */}
                    <div className="flex items-center">
                        <WalletMultiButtonDynamic className="!bg-blue-500 hover:!bg-blue-600 !rounded-lg" />
                    </div>
                </div>
            </div>
        </header>
    );
} 