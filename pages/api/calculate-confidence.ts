import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

// Ensure your OPENAI_API_KEY is set in your .env.local file
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

interface RequestData {
    reviewText: string;
    starRating: number; // Overall star rating (1-5)
    visitCount: number; // User's visit frequency for this restaurant
}

interface ResponseData {
    calculatedConfidenceLevel?: number;
    error?: string;
    debug?: any; // Optional: for sending back more debug info during development
}

// Placeholder for scaling visit count to a reasonable score contribution (e.g., 0-2 points)
function getVisitFrequencyContribution(visitCount: number): number {
    if (visitCount >= 10) return 2;
    if (visitCount >= 3) return 1;
    return 0;
}

// Placeholder for review text length contribution (e.g., 0-3 points)
function getTextLengthContribution(reviewText: string): number {
    const length = reviewText.trim().length;
    if (length > 200) return 3; // Very detailed
    if (length > 100) return 2; // Detailed
    if (length > 20) return 1;  // Minimal effort
    return 0; // Very short or empty
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ResponseData>
) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    if (!process.env.OPENAI_API_KEY) {
        console.error("OpenAI API key not configured. API route will use placeholder logic.");
        // Fallback to placeholder if API key is missing, instead of hard erroring, 
        // to allow testing placeholder flow easily.
    }

    try {
        const {
            reviewText,
            starRating,
            visitCount,
        } = req.body as RequestData;

        // Log received inputs
        console.log("--- API /api/calculate-confidence --- INPUTS ---");
        console.log("Received reviewText (first 50 chars):", reviewText.substring(0, 50));
        console.log("Received starRating:", starRating, "(type:", typeof starRating, ")");
        console.log("Received visitCount:", visitCount, "(type:", typeof visitCount, ")");

        if (!reviewText || starRating === undefined || visitCount === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        if (starRating < 1 || starRating > 5) return res.status(400).json({ error: 'Invalid star rating' });
        if (visitCount < 0) return res.status(400).json({ error: 'Invalid visit count' });

        let calculatedConfidenceLevel = 5; // Default fallback

        // If OpenAI API key is available, try to use OpenAI
        if (process.env.OPENAI_API_KEY) {
            console.log("--- Attempting OpenAI API Call ---");
            const systemPrompt = `You are a sophisticated restaurant review confidence score calculator. 
            Your task is to determine a 'confidence level' for a given review, on a scale of 1 to 10, where 1 is very low confidence and 10 is very high confidence. 
            Consider factors like: review text detail and specificity, sentiment consistency with star rating, length of review, and user's visit count to the restaurant (higher visit count might indicate a more informed opinion). 
            Based on your analysis, provide a single integer score between 1 and 10. Output only the integer score.`;

            const userPrompt = `Analyze the following restaurant review data and provide a confidence score (1-10):
            Review Text: "${reviewText}"
            User's Overall Star Rating: ${starRating}/5
            User's Visit Count to this Restaurant: ${visitCount}
            
            Confidence Score (1-10):`;

            try {
                const completion = await openai.chat.completions.create({
                    model: "gpt-3.5-turbo",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt },
                    ],
                    temperature: 0.3,
                    max_tokens: 10,
                });

                const aiResponse = completion.choices[0].message.content?.trim();
                console.log("Raw AI Response:", aiResponse);

                if (aiResponse) {
                    const parsedScore = parseInt(aiResponse, 10);
                    if (!isNaN(parsedScore)) {
                        calculatedConfidenceLevel = Math.max(1, Math.min(10, parsedScore));
                        console.log("Score from AI (clamped):", calculatedConfidenceLevel);
                    } else {
                        console.warn("OpenAI did not return a valid number. Raw response:", aiResponse, "Using fallback score.");
                    }
                } else {
                    console.warn("OpenAI returned an empty response. Using fallback score.");
                }
            } catch (aiError: any) {
                console.error("Error calling OpenAI API:", aiError.message);
                console.log("OpenAI call failed. Falling back to placeholder logic.");
                // Fall through to placeholder if AI call fails
            }
        }

        // Fallback to placeholder logic if API key is missing OR if OpenAI call failed above
        if (!process.env.OPENAI_API_KEY || calculatedConfidenceLevel === 5) { // The second condition means AI failed or returned a 5 itself or couldn't parse
            console.log("--- Using Placeholder Calculation --- (Reason: No API Key or AI failed/defaulted)");
            console.log("Input starRating:", starRating);
            console.log("Input visitCount:", visitCount);
            console.log("Input reviewText.trim() (length):", reviewText.trim().length);

            let placeholderScore = starRating;
            console.log("Initial placeholderScore (from starRating):", placeholderScore);

            const visitContribution = getVisitFrequencyContribution(visitCount);
            console.log("Visit Frequency Contribution:", visitContribution);
            placeholderScore += visitContribution;
            console.log("PlaceholderScore after visit contribution:", placeholderScore);

            const lengthContribution = getTextLengthContribution(reviewText);
            console.log("Text Length Contribution:", lengthContribution);
            placeholderScore += lengthContribution;
            console.log("PlaceholderScore after length contribution (raw total):", placeholderScore);

            calculatedConfidenceLevel = Math.round(Math.max(1, Math.min(10, placeholderScore)));
            console.log("Final Clamped Placeholder Confidence Level:", calculatedConfidenceLevel);
        }

        console.log("API final calculatedConfidenceLevel to be sent:", calculatedConfidenceLevel);
        res.status(200).json({ calculatedConfidenceLevel });

    } catch (err: any) {
        console.error("Error in /api/calculate-confidence (outer try-catch):", err);
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
} 