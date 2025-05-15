import { PublicKey } from '@solana/web3.js';

// Replace with your actual deployed program ID
export const PROGRAM_ID_STRING = "9MGNGbBKQqxDhVkRxuH5qDyovnpUw1FviYEUNcN7WUD"; // From your utils/program.ts
export const PROGRAM_ID_PK = new PublicKey(PROGRAM_ID_STRING);

// Define the structure for your restaurant data constants
export interface RestaurantConstantData {
    id: number; // Numeric ID used for linking from pages/index.tsx
    publicKey: PublicKey; // Actual PublicKey for the restaurant on Solana
    name: string;
    description?: string;
    rating?: number;
    reviews?: number;
    cuisine?: string;
    address?: string;
    hours?: string;
    phone?: string;
    image: string;
}

// Restaurant data - an array of restaurant objects.
// The `id` is the numeric identifier used in routing from the home page.
// The `publicKey` is the on-chain identifier for the restaurant.
// IMPORTANT: The PublicKeys below are VALID Base58 strings but are RANDOM placeholders.
// You MUST replace them with PDAs correctly derived for your program logic for the app to function as intended.
export const RESTAURANTS_DATA: RestaurantConstantData[] = [
    {
        id: 1,
        publicKey: new PublicKey("GKot5hBsd81kMupNCXHaqDutE1GrtLwQ2hcm2nHeXLW4"),
        name: "Sushi Master",
        description: "Authentic Japanese cuisine with fresh ingredients and masterful preparation.",
        rating: 4.8,
        reviews: 234,
        cuisine: "Japanese",
        address: "123 Ocean Drive, San Francisco",
        hours: "11:00 AM - 10:00 PM",
        phone: "(555) 123-4567",
        image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=500&auto=format&fit=crop&q=60",
    },
    {
        id: 2,
        publicKey: new PublicKey("2xVqj3Z5sY6p8tA7cW9E1mN4bK2gP9fH6hL3jJ5oD7sQ"),
        name: "Pasta Paradise",
        description: "Traditional Italian pasta dishes made with homemade pasta and secret family recipes.",
        rating: 4.6,
        reviews: 189,
        cuisine: "Italian",
        address: "456 Main Street, San Francisco",
        hours: "12:00 PM - 11:00 PM",
        phone: "(555) 234-5678",
        image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&auto=format&fit=crop&q=60",
    },
    {
        id: 3,
        publicKey: new PublicKey("HjP7kL9bR4wS2vA1nZ6cV3xU8fG5tY9oE6mQ4dB2sX1z"),
        name: "Burger Haven",
        description: "Gourmet burgers with locally sourced beef and artisanal buns.",
        rating: 4.5,
        reviews: 312,
        cuisine: "American",
        address: "789 Market Street, San Francisco",
        hours: "10:00 AM - 9:00 PM",
        phone: "(555) 345-6789",
        image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60",
    },
    {
        id: 4,
        publicKey: new PublicKey("CvL9xG2kS7bR4jA1mP5wE8nZ3tH6fVqY9oU2dBcX1oDh"),
        name: "Spice Garden",
        description: "Authentic Indian cuisine with a modern twist and extensive vegetarian options.",
        rating: 4.7,
        reviews: 156,
        cuisine: "Indian",
        address: "321 Curry Lane, San Francisco",
        hours: "11:30 AM - 10:30 PM",
        phone: "(555) 456-7890",
        image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=500&auto=format&fit=crop&q=60",
    }
]; 