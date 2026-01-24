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
            const userName = req.session.user ? req.session.user.name : "Traveler";

            // 1. FETCH LIVE TOUR DATA (FIXED QUERY)
            // We use a subquery to fetch category names and join them into a string (e.g., "Adventure, Safari")
            const toursQuery = await db.query(`
                SELECT 
                    t.id, 
                    t.title, 
                    t.location, 
                    t.price, 
                    t.start_date, 
                    t.duration_days, 
                    t.short_description, 
                    t.slug, 
                    t.capacity,
                    COALESCE((
                        SELECT STRING_AGG(c.name, ', ')
                        FROM tour_categories tc
                        JOIN categories c ON tc.category_id = c.id
                        WHERE tc.tour_id = t.id
                    ), 'General') as category
                FROM tours t 
                WHERE t.status IN ('available', 'upcoming')
            `);

            // 2. DEFINE STATIC KNOWLEDGE
            const companyInfo = {
                name: "Casalinga Tours",
                phone: "+27 65 921 4974",
                email: "samkecassy01@gmail.com",
                address: "Cnr R40 & D724 road, Mbombela, South Africa",
                website_links: {
                    home: "/",
                    all_tours: "/tours",
                    contact: "/contact",
                    login: "/auth/login",
                    register: "/auth/register",
                    dashboard: "/user/dashboard"
                }
            };

            // 3. GET USER CONTEXT
            let userContext = `The user is a guest named '${userName}'.`;
            if (userId) {
                const bookings = await db.query(`
                    SELECT b.booking_number, t.title, b.status, b.total_price 
                    FROM bookings b JOIN tours t ON b.tour_id = t.id 
                    WHERE b.user_id = $1
                    ORDER BY b.booked_at DESC LIMIT 3
                `, [userId]);
                
                if (bookings.rows.length > 0) {
                    userContext = `User '${userName}' is logged in. 
                    Recent Bookings: ${JSON.stringify(bookings.rows)}.
                    If they ask about their booking, summarize the status.`;
                } else {
                    userContext = `User '${userName}' is logged in but has no bookings yet.`;
                }
            } else {
                userContext += " Encourage them to Login (/auth/login) to book tours.";
            }

            // 4. CONSTRUCT THE "BRAIN"
            const contextPrompt = `
                You are 'Casi', the advanced AI concierge for Casalinga Tours.
                
                --- KNOWLEDGE BASE ---
                COMPANY DETAILS: ${JSON.stringify(companyInfo)}
                AVAILABLE TOURS: ${JSON.stringify(toursQuery.rows)}
                CURRENT USER: ${userContext}
                
                --- INSTRUCTIONS ---
                1. **LINKS:** When mentioning a specific tour, ALWAYS provide a clickable HTML link using this format: 
                   <a href="/tours/TOUR_SLUG" class="text-primary font-bold hover:underline">Tour Title</a>.
                2. **PAGES:** If the user wants to login, contact support, or register, use the links from COMPANY DETAILS.
                   Example: <a href="/auth/login" class="text-primary font-bold underline">Login here</a>.
                3. **PRICING:** Always format prices as 'R' (ZAR). Example: R15,000.
                4. **RECOMMENDATIONS:** If asked for recommendations, look at the TOUR LIST categories/locations and recommend specific matches with links.
                5. **FORMATTING:** Use <br> for line breaks and <strong> for emphasis. Do not use Markdown.

                --- USER QUERY ---
                "${message}"
            `;

            // 5. ASK GEMINI
            const result = await model.generateContent(contextPrompt);
            const response = result.response.text();

            res.json({ success: true, reply: response });

        } catch (error) {
            console.error('Chatbot Error:', error);
            res.status(500).json({ success: false, reply: "I'm having a little trouble connecting to headquarters. Please try again later! 🔌" });
        }
    }
};

module.exports = chatController;