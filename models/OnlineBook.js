const db = require('../config/db');
const OnlineBook = {
  async all() {
    const r = await db.query(`
      SELECT ob.*, (SELECT COUNT(*) FROM online_book_chapters WHERE online_book_id=ob.id) AS chapter_count
      FROM online_books ob ORDER BY ob.created_at DESC`);
    return r.rows;
  },
  async published() {
    const r = await db.query(`
      SELECT ob.*, (SELECT COUNT(*) FROM online_book_chapters WHERE online_book_id=ob.id) AS chapter_count
      FROM online_books ob WHERE ob.is_published=1 ORDER BY ob.created_at DESC`);
    return r.rows;
  },
  async findById(id) {
    const r = await db.query('SELECT * FROM online_books WHERE id=$1', [id]);
    return r.rows[0];
  },
  async findBySlug(slug) {
    const r = await db.query('SELECT * FROM online_books WHERE slug=$1', [slug]);
    return r.rows[0];
  },
  async create(data) {
    const { title, slug, author, short_desc, description, cover_url, price, compare_at_price, is_published, file_url, file_source } = data;
    const r = await db.query(
      `INSERT INTO online_books (title,slug,author,short_desc,description,cover_url,price,compare_at_price,is_published,file_url,file_source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [title, slug, author || '', short_desc || '', description || '', cover_url || null, price || 0, compare_at_price || null, is_published ? 1 : 0, file_url || null, file_source || null]
    );
    return r.rows[0];
  },
  async update(id, data) {
    const { title, author, short_desc, description, cover_url, price, compare_at_price, is_published, file_url, file_source } = data;
    await db.query(
      `UPDATE online_books SET title=$1, author=$2, short_desc=$3, description=$4,
       cover_url=COALESCE($5,cover_url), price=$6, compare_at_price=$7, is_published=$8,
       file_url=COALESCE($9,file_url), file_source=COALESCE($10,file_source) WHERE id=$11`,
      [title, author || '', short_desc || '', description || '', cover_url || null, price || 0, compare_at_price || null, is_published ? 1 : 0, file_url || null, file_source || null, id]
    );
  },
  async delete(id) {
    await db.query('DELETE FROM online_books WHERE id=$1', [id]);
  },
  async count() {
    const r = await db.query('SELECT COUNT(*) c FROM online_books');
    return parseInt(r.rows[0].c);
  }
};
module.exports = OnlineBook;
