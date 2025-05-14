import idlJson from './restaurant_booking.json'; // Imports your actual IDL JSON

// Export the IDL JSON object directly
export const IDL = idlJson;

// Define and export the TypeScript type for your program
// This should match the structure of your idlJson.
export type RestaurantBooking = {
    version: string;
    name: string;
    instructions: typeof idlJson.instructions;
    accounts?: typeof idlJson.accounts;
    errors?: typeof idlJson.errors;
    types?: any[]; // Add if you have 'types' in your IDL (yours doesn't in the provided JSON)
    metadata?: any; // Add if you have 'metadata' in your IDL (yours doesn't in the provided JSON)
}; 