const db = require('../config/database');

const adminChatController = {
    
    // GET /admin/chatbot - View Knowledge Base
    getChatbotKnowledge: async (req, res) => {
        try {
            // Fetch all knowledge sorted by newest first
            const knowledge = await db.query(
                'SELECT * FROM bot_knowledge ORDER BY created_at DESC'
            );

            res.render('admin/chatbot', {
                title: 'Train Casi AI - Admin',
                knowledge: knowledge.rows,
                user: req.session.user,
                // Pass flash messages
                success: req.session.success,
                error: req.session.error
            });
            
            // Clear flash messages after render so they don't persist
            req.session.success = null;
            req.session.error = null;

        } catch (error) {
            console.error('Get chatbot knowledge error:', error);
            res.status(500).render('error/500');
        }
    },

    // POST /admin/chatbot/train - Add New Fact
    addChatbotKnowledge: async (req, res) => {
        try {
            const { topic, question, answer } = req.body;

            if (!topic || !question || !answer) {
                req.session.error = 'All fields are required.';
                return res.redirect('/admin/chatbot');
            }

            await db.query(
                'INSERT INTO bot_knowledge (topic, question, answer) VALUES ($1, $2, $3)',
                [topic, question, answer]
            );

            req.session.success = 'New knowledge added to Casi\'s brain!';
            res.redirect('/admin/chatbot');

        } catch (error) {
            console.error('Add chatbot knowledge error:', error);
            req.session.error = 'Failed to add knowledge.';
            res.redirect('/admin/chatbot');
        }
    },

    // POST /admin/chatbot/delete/:id - Remove Fact
    deleteChatbotKnowledge: async (req, res) => {
        try {
            const { id } = req.params;
            
            await db.query('DELETE FROM bot_knowledge WHERE id = $1', [id]);
            
            req.session.success = 'Knowledge deleted successfully.';
            res.redirect('/admin/chatbot');

        } catch (error) {
            console.error('Delete chatbot knowledge error:', error);
            req.session.error = 'Failed to delete knowledge.';
            res.redirect('/admin/chatbot');
        }
    },
};

module.exports = adminChatController;