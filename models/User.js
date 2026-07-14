const db = require('../config/db');

const User = {
  async findByEmail(email) {
    const r = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return r.rows[0];
  },
  async findById(id) {
    const r = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    return r.rows[0];
  },
  async create({ name, email, password_hash, role = 'student' }) {
    const r = await db.query(
      `INSERT INTO users (name,email,password_hash,role) VALUES ($1,$2,$3,$4) RETURNING *`,
      [name, email, password_hash, role]
    );
    return r.rows[0];
  },
  async updatePassword(id, password_hash) {
    await db.query('UPDATE users SET password_hash=$1 WHERE id=$2', [password_hash, id]);
  },
  async updateProfile(id, { name, phone, avatar_url }) {
    await db.query('UPDATE users SET name=$1, phone=$2, avatar_url=COALESCE($3,avatar_url) WHERE id=$4',
      [name, phone, avatar_url, id]);
  },
  async listStudents() {
    const r = await db.query(`SELECT * FROM users WHERE role='student' ORDER BY created_at DESC`);
    return r.rows;
  },
  async listStaff() {
    const r = await db.query(`SELECT * FROM users WHERE role != 'student' ORDER BY
      CASE role WHEN 'super_admin' THEN 1 WHEN 'admin' THEN 2 WHEN 'teacher' THEN 3 WHEN 'ta' THEN 4 END`);
    return r.rows;
  },
  async setRole(id, role) {
    await db.query('UPDATE users SET role=$1 WHERE id=$2', [role, id]);
  },
  async setActive(id, is_active) {
    await db.query('UPDATE users SET is_active=$1 WHERE id=$2', [is_active, id]);
  },
  async count() {
    const r = await db.query(`SELECT COUNT(*) c FROM users WHERE role='student'`);
    return parseInt(r.rows[0].c);
  },
  async addPoints(id, points) {
    await db.query('UPDATE users SET points = points + $1 WHERE id=$2', [points, id]);
  }
};
module.exports = User;
