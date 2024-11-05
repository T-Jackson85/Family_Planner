const db = require("../db"); 
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

class Event {
    /** Create a new event in the database.
     * Accepts { title, description, date, location, hostId, groupId }
     * Returns { id, title, description, date, location, hostId, groupId }
     * Throws BadRequestError if required fields are missing.
     */
    static async create({ title, description, date, location, hostId, groupId }) {
        if (!title || !date || !location || !hostId || !groupId) {
            throw new BadRequestError("Missing required fields for creating event.");
        }

        const result = await db.query(
            `INSERT INTO events (title, description, date, location, host_id, group_id)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, title, description, date, location, host_id AS "hostId", group_id AS "groupId"`,
            [title, description, date, location, hostId, groupId]
        );

        return result.rows[0];
    }

    /** Find all events.
     * Returns [{ id, title, description, date, location, hostId, groupId }, ...]
     */
    static async findAll() {
        const result = await db.query(
            `SELECT id, title, description, date, location, host_id AS "hostId", group_id AS "groupId"
             FROM events`
        );

        return result.rows;
    }

    /** Find a specific event by ID.
     * Returns { id, title, description, date, location, hostId, groupId, comments, host, group }
     * Throws NotFoundError if event not found.
     */
    static async get(id) {
        const eventRes = await db.query(
            `SELECT id, title, description, date, location, host_id AS "hostId", group_id AS "groupId"
             FROM events
             WHERE id = $1`,
            [id]
        );

        const event = eventRes.rows[0];
        if (!event) throw new NotFoundError(`No event found with ID: ${id}`);

        // Fetch comments, host, and group associated with the event
        const commentsRes = await db.query(
            `SELECT id, content, user_id AS "userId", created_at AS "createdAt"
             FROM comments
             WHERE event_id = $1`,
            [id]
        );

        const hostRes = await db.query(
            `SELECT id, firstname, lastname, email
             FROM users
             WHERE id = $1`,
            [event.hostId]
        );

        const groupRes = await db.query(
            `SELECT id, name, admin_id AS "adminId"
             FROM groups
             WHERE id = $1`,
            [event.groupId]
        );

        event.comments = commentsRes.rows;
        event.host = hostRes.rows[0];
        event.group = groupRes.rows[0];

        return event;
    }

    /** Update event data with `data`.
     * This is a "partial update" --- only provided fields are updated.
     * Data can include: { title, description, date, location }
     * Returns { id, title, description, date, location, hostId, groupId }
     * Throws NotFoundError if event not found.
     */
    static async update(id, data) {
        const { setCols, values } = sqlForPartialUpdate(data, {
            hostId: "host_id",
            groupId: "group_id",
        });
        const idVarIdx = `$${values.length + 1}`;

        const querySql = `UPDATE events 
                          SET ${setCols} 
                          WHERE id = ${idVarIdx} 
                          RETURNING id, title, description, date, location, host_id AS "hostId", group_id AS "groupId"`;
        const result = await db.query(querySql, [...values, id]);
        const event = result.rows[0];

        if (!event) throw new NotFoundError(`No event found with ID: ${id}`);
        return event;
    }

    /** Delete an event from the database.
     * Throws NotFoundError if event not found.
     */
    static async remove(id) {
        const result = await db.query(
            `DELETE
             FROM events
             WHERE id = $1
             RETURNING id`,
            [id]
        );

        const event = result.rows[0];
        if (!event) throw new NotFoundError(`No event found with ID: ${id}`);
    }
}

module.exports = Event;
