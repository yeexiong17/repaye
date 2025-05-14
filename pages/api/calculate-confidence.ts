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
        console.error("OpenAI API key not configured.");
        return res.status(500).json({ error: 'OpenAI API key not configured. Admin check needed.' });
    }

    try {
        const {
            reviewText,
            starRating,
            visitCount,
        } = req.body as RequestData;

        if (!reviewText || starRating === undefined || visitCount === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        if (starRating < 1 || starRating > 5) return res.status(400).json({ error: 'Invalid star rating' });
        if (visitCount < 0) return res.status(400).json({ error: 'Invalid visit count' });

        const systemPrompt = `You are a sophisticated restaurant review confidence score calculator. 
    Your task is to determine a 'confidence level' for a given review, on a scale of 1 to 10, where 1 is very low confidence and 10 is very high confidence. 
    Consider factors like: review text detail and specificity, sentiment consistency with star rating, length of review, and user's visit count to the restaurant (higher visit count might indicate a more informed opinion). 
    Based on your analysis, provide a single integer score between 1 and 10. Output only the integer score.`;

        const userPrompt = `Analyze the following restaurant review data and provide a confidence score (1-10):
    Review Text: "${reviewText}"
    User's Overall Star Rating: ${starRating}/5
    User's Visit Count to this Restaurant: ${visitCount}
    
    Confidence Score (1-10):`;

        // console.log("Sending prompt to OpenAI:", userPrompt); // For debugging

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", // Or use "gpt-4" if you have access and prefer it
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            temperature: 0.3, // Lower temperature for more deterministic score output
            max_tokens: 10,   // Expecting a short numerical answer
        });

        const aiResponse = completion.choices[0].message.content?.trim();
        // console.log("Raw AI Response:", aiResponse); // For debugging

        let calculatedConfidenceLevel = 5; // Default fallback

        if (aiResponse) {
            const parsedScore = parseInt(aiResponse, 10);
            if (!isNaN(parsedScore)) {
                calculatedConfidenceLevel = Math.max(1, Math.min(10, parsedScore)); // Clamp between 1 and 10
            } else {
                console.warn("OpenAI did not return a valid number. Raw response:", aiResponse);
                // Optionally, you could try a more advanced regex or string search if the model includes explanatory text
            }
        } else {
            console.warn("OpenAI returned an empty response.");
        }
        console.log(calculatedConfidenceLevel);
        res.status(200).json({ calculatedConfidenceLevel });

    } catch (err: any) {
        console.error("Error calling OpenAI API or processing in /api/calculate-confidence:", err);
        let errorMessage = 'Internal server error calling AI service.';
        if (err.response) { // Axios-like error structure from OpenAI library
            console.error('OpenAI API Error Status:', err.response.status);
            console.error('OpenAI API Error Data:', err.response.data);
            errorMessage = `OpenAI API Error: ${err.response.data?.error?.message || err.message}`;
        } else if (err.message) {
            errorMessage = err.message;
        }
        res.status(500).json({ error: errorMessage, debug: err });
    }
} 