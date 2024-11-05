const db = require("../db"); // Custom db connection or ORM configuration
const { BadRequestError, NotFoundError } = require("../expressError");

class Task {
    /** Create a new task in the database.
     * Accepts { title, userId, eventId, isCompleted }
     * Returns { id, title, userId, eventId, isCompleted, createdAt }
     * Throws BadRequestError if required fields are missing.
     */
    static async create({ title, userId, eventId, isCompleted = false }) {
        if (!title || !userId || !eventId) {
            throw new BadRequestError("Missing required fields for creating task.");
        }

        const result = await db.query(
            `INSERT INTO tasks (title, user_id, event_id, is_completed)
             VALUES ($1, $2, $3, $4)
             RETURNING id, title, user_id AS "userId", event_id AS "eventId", is_completed AS "isCompleted", created_at AS "createdAt"`,
            [title, userId, eventId, isCompleted]
        );

        return result.rows[0];
    }

    /** Find all tasks for a specific user.
     * Accepts userId
     * Returns [{ id, title, userId, eventId, isCompleted, createdAt }, ...]
     */
    static async findAllForUser(userId) {
        const result = await db.query(
            `SELECT id, title, user_id AS "userId", event_id AS "eventId", is_completed AS "isCompleted", created_at AS "createdAt"
             FROM tasks
             WHERE user_id = $1`,
            [userId]
        );

        return result.rows;
    }

    /** Find a specific task by ID.
     * Returns { id, title, userId, eventId, isCompleted, createdAt }
     * Throws NotFoundError if task not found.
     */
    static async get(id) {
        const result = await db.query(
            `SELECT id, title, user_id AS "userId", event_id AS "eventId", is_completed AS "isCompleted", created_at AS "createdAt"
             FROM tasks
             WHERE id = $1`,
            [id]
        );

        const task = result.rows[0];
        if (!task) throw new NotFoundError(`No task found with ID: ${id}`);
        
        return task;
    }

    /** Update task data with `data`.
     * This is a "partial update" --- only provided fields are updated.
     * Data can include: { title, isCompleted }
     * Returns { id, title, userId, eventId, isCompleted, createdAt }
     * Throws NotFoundError if task not found.
     */
    static async update(id, data) {
        const { setCols, values } = sqlForPartialUpdate(data, { isCompleted: "is_completed" });
        const idVarIdx = `$${values.length + 1}`;

        const querySql = `UPDATE tasks 
                          SET ${setCols} 
                          WHERE id = ${idVarIdx} 
                          RETURNING id, title, user_id AS "userId", event_id AS "eventId", is_completed AS "isCompleted", created_at AS "createdAt"`;
        const result = await db.query(querySql, [...values, id]);
        const task = result.rows[0];

        if (!task) throw new NotFoundError(`No task found with ID: ${id}`);
        return task;
    }

    /** Delete a task from the database.
     * Throws NotFoundError if task not found.
     */
    static async remove(id) {
        const result = await db.query(
            `DELETE
             FROM tasks
             WHERE id = $1
             RETURNING id`,
            [id]
        );

        const task = result.rows[0];
        if (!task) throw new NotFoundError(`No task found with ID: ${id}`);
    }
}

module.exports = Task;
