const db = require('../config/database');

const Category = {
    findAll: async () => {
        const result = await db.query(
            'SELECT * FROM categories ORDER BY name'
        );
        return result.rows;
    },

    findById: async (id) => {
        const result = await db.query(
            'SELECT * FROM categories WHERE id = $1',
            [id]
        );
        return result.rows[0];
    },

    create: async (name, description = '', icon = '', color = '') => {
        const result = await db.query(
            `INSERT INTO categories (name, description, icon, color) 
             VALUES ($1, $2, $3, $4) 
             RETURNING *`,
            [name, description, icon, color]
        );
        return result.rows[0];
    },

    update: async (id, data) => {
        const { name, description, icon, color } = data;
        const result = await db.query(
            `UPDATE categories 
             SET name = $1, description = $2, icon = $3, color = $4 
             WHERE id = $5 
             RETURNING *`,
            [name, description, icon, color, id]
        );
        return result.rows[0];
    },

    delete: async (id) => {
        const result = await db.query(
            'DELETE FROM categories WHERE id = $1 RETURNING id',
            [id]
        );
        return result.rows[0];
    }
};

module.exports = Category;