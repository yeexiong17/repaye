import { ReactNode } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Menu, X, BookOpen, Home, User, Settings } from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';

interface LayoutProps {
    children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    const { publicKey } = useWallet();
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            {/* Navigation */}
            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex items-center">
                                <Link href="/" className="flex items-center">
                                    <Image
                                        src="/solana-logo.svg"
                                        alt="SolDine Logo"
                                        width={30}
                                        height={30}
                                        className="mr-2"
                                    />
                                    <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
                                        SolDine
                                    </span>
                                </Link>
                            </div>

                            {/* Desktop navigation links */}
                            <nav className="hidden sm:ml-6 sm:flex sm:space-x-8">
                                <Link href="/" className="border-transparent hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                                    <Home className="mr-1 h-4 w-4" />
                                    Home
                                </Link>
                                <Link href="/bookings" className="border-transparent hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                                    <BookOpen className="mr-1 h-4 w-4" />
                                    My Bookings
                                </Link>
                            </nav>
                        </div>

                        {/* Wallet button */}
                        <div className="flex items-center">
                            <WalletMultiButton className="!bg-blue-500 hover:!bg-blue-600 !rounded-lg" />

                            {/* Mobile menu button */}
                            <button
                                className="sm:hidden ml-2 inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                                onClick={() => setMenuOpen(!menuOpen)}
                            >
                                {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile menu */}
                {menuOpen && (
                    <div className="sm:hidden">
                        <div className="pt-2 pb-3 space-y-1">
                            <Link
                                href="/"
                                className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium hover:bg-gray-50 hover:border-gray-300"
                                onClick={() => setMenuOpen(false)}
                            >
                                <div className="flex items-center">
                                    <Home className="mr-2 h-5 w-5" />
                                    Home
                                </div>
                            </Link>
                            <Link
                                href="/bookings"
                                className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium hover:bg-gray-50 hover:border-gray-300"
                                onClick={() => setMenuOpen(false)}
                            >
                                <div className="flex items-center">
                                    <BookOpen className="mr-2 h-5 w-5" />
                                    My Bookings
                                </div>
                            </Link>
                        </div>
                    </div>
                )}
            </header>

            {/* Main content */}
            <main className="flex-grow">
                {children}
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 mt-auto">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <div className="flex items-center mb-4 md:mb-0">
                            <Image
                                src="/solana-logo.svg"
                                alt="SolDine Logo"
                                width={24}
                                height={24}
                                className="mr-2"
                            />
                            <span className="font-semibold text-gray-800">SolDine</span>
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