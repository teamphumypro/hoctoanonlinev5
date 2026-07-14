const db = require('../config/db');
const ActivationCode = {
  async byCourse(course_id) {
    const r = await db.query('SELECT * FROM activation_codes WHERE course_id=$1 ORDER BY created_at DESC', [course_id]);
    return r.rows;
  },
  async findByCode(code) {
    const r = await db.query('SELECT * FROM activation_codes WHERE code=$1', [code]);
    return r.rows[0];
  },
  async create(code, course_id) {
    const r = await db.query(
      `INSERT INTO activation_codes (code, course_id) VALUES ($1,$2) RETURNING *`,
      [code, course_id]
    );
    return r.rows[0];
  },
  async markUsed(id, user_id) {
    await db.query(
      `UPDATE activation_codes SET is_used=1, used_by_user_id=$1, used_at=now() WHERE id=$2`,
      [user_id, id]
    );
  },
  async delete(id) {
    await db.query('DELETE FROM activation_codes WHERE id=$1', [id]);
  }
};
module.exports = ActivationCode;
