const { client } = require('../config/database');

class Task {
  static async create(userId, title, description, deadline, priority = 'medium', category = 'General') {
    const query = `
      INSERT INTO tasks (userId, title, description, deadline, priority, category)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [userId, title, description, deadline, priority, category];
    const result = await client.query(query, values);
    return result.rows[0];
  }

  static async getAll(userId) {
    const query = 'SELECT * FROM tasks WHERE userId = $1 ORDER BY deadline;';
    const result = await client.query(query, [userId]);
    return result.rows;
  }

  static async getIncomplete(userId) {
    const query = 'SELECT * FROM tasks WHERE userId = $1 AND completed = FALSE ORDER BY deadline;';
    const result = await client.query(query, [userId]);
    return result.rows;
  }

  static async complete(taskId, userId) {
    const query = 'UPDATE tasks SET completed = TRUE WHERE id = $1 AND userId = $2 RETURNING *;';
    const result = await client.query(query, [taskId, userId]);
    return result.rows[0];
  }

  static async getTomorrowTasks() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const query = `
      SELECT * FROM tasks 
      WHERE DATE(deadline) = $1 
      AND completed = FALSE;
    `;
    const result = await client.query(query, [tomorrow]);
    return result.rows;
  }
}

module.exports = Task;
