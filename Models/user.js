const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

class User {
    /** Create a User (from data), update db, and return new user data.
     * data should be { firstname, lastname, email, birthdate, phone, location, avatar, wallpaper, createdAt }
     * Returns { firstname, lastname, email, birthdate, phone, location, avatar, wallpaper, createdAt }
     * Throws BadRequestError if user is already in the database.
     */
    static async create({ firstname, lastname, email, birthdate, phone, location, avatar, wallpaper, createdAt }) {
        const duplicateCheck = await db.query(
            `SELECT email
             FROM users
             WHERE email = $1`,
            [email]
        );

        if (duplicateCheck.rows[0]) {
            throw new BadRequestError(`User ${firstname} ${lastname} already exists`);
        }

        const result = await db.query(
            `INSERT INTO users
             (firstname, lastname, email, birthdate, phone, location, avatar, wallpaper, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING firstname, lastname, email, birthdate, phone, location, avatar, wallpaper, created_at AS "createdAt"`,
            [
                firstname, 
                lastname,
                email, 
                birthdate, 
                phone, 
                location, 
                avatar, 
                wallpaper, 
                createdAt
            ]
        );

        return result.rows[0];
    }

    /** Find all users. 
     * Returns [{ firstname, lastname, email, birthdate, phone, location, avatar, wallpaper, createdAt }, ...]
     */
    static async findAll() {
        const userRes = await db.query(
            `SELECT firstname, lastname, email, birthdate, phone, location, avatar, wallpaper, created_at AS "createdAt"
             FROM users`
        );
        
        return userRes.rows;
    }

    /** Find a specific user by their unique identifier.
     * Throws NotFoundError if the user is not found.
     */
    static async findOne(id) {
        const userRes = await db.query(
            `SELECT firstname, lastname, email, birthdate, phone, location, avatar, wallpaper, created_at AS "createdAt"
             FROM users 
             WHERE id = $1`,
            [id]
        );

        const user = userRes.rows[0];
        if (!user) throw new NotFoundError(`No user found with ID: ${id}`);
        return user;
    }

    /** Update user data with `data`.
     * This is a partial update, meaning only provided fields will be updated.
     * Returns the updated user data.
     * Throws NotFoundError if the user is not found.
     */
    static async update(id, data) {
        const { setCols, values } = sqlForPartialUpdate(
            data,
            {
                birthdate: "birthdate",
                phone: "phone",
                location: "location",
                avatar: "avatar",
                wallpaper: "wallpaper"
            }
        );
        const userIdVarIdx = `$${values.length + 1}`;

        const querySql = `UPDATE users 
                          SET ${setCols} 
                          WHERE id = ${userIdVarIdx} 
                          RETURNING firstname, lastname, email, birthdate, phone, location, avatar, wallpaper, created_at AS "createdAt"`;
        const result = await db.query(querySql, [...values, id]);
        const user = result.rows[0];

        if (!user) throw new NotFoundError(`No user found with ID: ${id}`);
        return user;
    }

    /** Delete a user from the database.
     * Throws NotFoundError if the user is not found.
     */
    static async remove(id) {
        const result = await db.query(
            `DELETE
             FROM users
             WHERE id = $1
             RETURNING id`,
            [id]
        );

        const user = result.rows[0];
        if (!user) throw new NotFoundError(`No user found with ID: ${id}`);
    }
}

module.exports = User;
