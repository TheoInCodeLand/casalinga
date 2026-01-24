const { GoogleGenerativeAI } = require("@google/generative-ai");
const db = require('../config/database');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const chatController = {
    // POST /api/chat
    handleChat: async (req, res) => {
        try {
            const { message } = req.body;
            const userId = req.session.user ? req.session.user.id : null;

            // 1. FETCH REAL-TIME DATA FROM DB
            // Get all available tours
            const toursQuery = await db.query(`
                SELECT id, title, location, price, start_date, duration_days, short_description 
                FROM tours 
                WHERE status IN ('available', 'upcoming')
            `);

            // (Optional) Get User's Bookings if logged in
            let userContext = "The user is a guest.";
            if (userId) {
                const bookings = await db.query(`
                    SELECT b.booking_number, t.title, b.status 
                    FROM bookings b JOIN tours t ON b.tour_id = t.id 
                    WHERE b.user_id = $1
                `, [userId]);
                
                if (bookings.rows.length > 0) {
                    userContext = `The user is logged in. Their bookings: ${JSON.stringify(bookings.rows)}`;
                } else {
                    userContext = "The user is logged in but has no bookings yet.";
                }
            }

            // 2. CONSTRUCT THE "BRAIN" (System Prompt)
            const contextPrompt = `
                You are 'Casi', the AI assistant for Casalinga Tours.
                Your tone is friendly, professional, and South African (use polite terms).
                
                HERE IS OUR LIVE DATABASE OF TOURS:
                ${JSON.stringify(toursQuery.rows)}

                USER CONTEXT:
                ${userContext}

                YOUR RULES:
                1. ONLY recommend tours from the list above. If it's not there, say we don't have it.
                2. If asked about prices, always include the "R" symbol (ZAR).
                3. If the user asks "Where can I go in December?", look at the 'start_date' in the data and recommend matching tours.
                4. Keep answers short (max 3 sentences) unless asked for details.
                
                USER QUESTION: "${message}"
            `;

            // 3. ASK GEMINI
            const result = await model.generateContent(contextPrompt);
            const response = result.response.text();

            res.json({ success: true, reply: response });

        } catch (error) {
            console.error('Chatbot Error:', error);
            res.status(500).json({ success: false, reply: "I'm having a little trouble connecting to headquarters. Please try again!" });
        }
    }
};

module.exports = chatController;