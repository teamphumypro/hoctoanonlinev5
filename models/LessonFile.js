const db = require('../config/db');
const LessonFile = {
  async byLesson(lesson_id) {
    const r = await db.query('SELECT * FROM lesson_files WHERE lesson_id=$1 ORDER BY position', [lesson_id]);
    return r.rows;
  },
  async create({ lesson_id, title, file_url, file_type, position }) {
    const posR = await db.query('SELECT COALESCE(MAX(position),0)+1 p FROM lesson_files WHERE lesson_id=$1', [lesson_id]);
    const r = await db.query(
      `INSERT INTO lesson_files (lesson_id,title,file_url,file_type,position) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [lesson_id, title, file_url, file_type || 'pdf', position ?? posR.rows[0].p]
    );
    return r.rows[0];
  },
  async delete(id) {
    await db.query('DELETE FROM lesson_files WHERE id=$1', [id]);
  }
};
module.exports = LessonFile;
