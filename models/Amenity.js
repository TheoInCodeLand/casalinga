const db = require('../config/database');

const Amenity = {
    findAll: async () => {
        const result = await db.query(
            'SELECT * FROM amenities ORDER BY name'
        );
        return result.rows;
    },

    findById: async (id) => {
        const result = await db.query(
            'SELECT * FROM amenities WHERE id = $1',
            [id]
        );
        return result.rows[0];
    },

    create: async (name, icon = '', description = '') => {
        const result = await db.query(
            `INSERT INTO amenities (name, icon, description) 
             VALUES ($1, $2, $3) 
             RETURNING *`,
            [name, icon, description]
        );
        return result.rows[0];
    },

    update: async (id, data) => {
        const { name, icon, description } = data;
        const result = await db.query(
            `UPDATE amenities 
             SET name = $1, icon = $2, description = $3 
             WHERE id = $4 
             RETURNING *`,
            [name, icon, description, id]
        );
        return result.rows[0];
    },

    delete: async (id) => {
        const result = await db.query(
            'DELETE FROM amenities WHERE id = $1 RETURNING id',
            [id]
        );
        return result.rows[0];
    }
};

module.exports = Amenity;