const db = require("../db"); 
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");


class Group {
    /** Create a new group in the database.
     * Accepts { name, adminId }
     * Returns { id, name, adminId }
     * Throws BadRequestError if group with the same name already exists.
     */
    static async create({ name, adminId }) {
        const duplicateCheck = await db.query(
            `SELECT name 
             FROM groups 
             WHERE name = $1`,
            [name]
        );

        if (duplicateCheck.rows[0]) {
            throw new BadRequestError(`Group with name ${name} already exists.`);
        }

        const result = await db.query(
            `INSERT INTO groups (name, admin_id)
             VALUES ($1, $2)
             RETURNING id, name, admin_id AS "adminId"`,
            [name, adminId]
        );

        return result.rows[0];
    }

    /** Find all groups.
     * Returns [{ id, name, adminId }, ...]
     */
    static async findAll() {
        const result = await db.query(
            `SELECT id, name, admin_id AS "adminId"
             FROM groups`
        );

        return result.rows;
    }

    /** Find a specific group by ID.
     * Returns { id, name, adminId, users, events }
     * Throws NotFoundError if group not found.
     */
    static async get(id) {
        const groupRes = await db.query(
            `SELECT id, name, admin_id AS "adminId"
             FROM groups
             WHERE id = $1`,
            [id]
        );

        const group = groupRes.rows[0];
        if (!group) throw new NotFoundError(`No group found with ID: ${id}`);

        // Fetch users and events associated with the group
        const usersRes = await db.query(
            `SELECT u.id, u.firstname, u.lastname, u.email 
             FROM users u
             JOIN group_users gu ON u.id = gu.user_id
             WHERE gu.group_id = $1`,
            [id]
        );

        const eventsRes = await db.query(
            `SELECT e.id, e.title, e.date, e.location
             FROM events e
             WHERE e.group_id = $1`,
            [id]
        );

        group.users = usersRes.rows;
        group.events = eventsRes.rows;
        
        return group;
    }

    /** Update group data with `data`.
     * This is a "partial update" --- only provided fields are updated.
     * Data can include: { name, adminId }
     * Returns { id, name, adminId }
     * Throws NotFoundError if group not found.
     */
    static async update(id, data) {
        const { setCols, values } = sqlForPartialUpdate(data, {
            adminId: "admin_id",
        });
        const idVarIdx = `$${values.length + 1}`;

        const querySql = `UPDATE groups 
                          SET ${setCols} 
                          WHERE id = ${idVarIdx} 
                          RETURNING id, name, admin_id AS "adminId"`;
        const result = await db.query(querySql, [...values, id]);
        const group = result.rows[0];

        if (!group) throw new NotFoundError(`No group found with ID: ${id}`);
        return group;
    }

    /** Delete a group from the database.
     * Throws NotFoundError if group not found.
     */
    static async remove(id) {
        const result = await db.query(
            `DELETE
             FROM groups
             WHERE id = $1
             RETURNING id`,
            [id]
        );

        const group = result.rows[0];
        if (!group) throw new NotFoundError(`No group found with ID: ${id}`);
    }
}

module.exports = Group;
