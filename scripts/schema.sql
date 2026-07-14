-- =========================================================
-- SCHEMA LMS - He thong quan ly hoc tap
-- 4 cap noi dung: Danh muc > Khoa hoc > Chuong > Bai > Tai nguyen
-- =========================================================

-- ---------- 6. PHAN QUYEN ----------
-- super_admin > admin > teacher (giang vien) > ta (tro giang) > student (hoc vien)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student'
    CHECK (role IN ('super_admin','admin','teacher','ta','student')),
  avatar_url TEXT,
  phone TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS login_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  logged_in_at TIMESTAMPTZ DEFAULT now()
);

-- ---------- 1. DANH MUC (cay khong gioi han cap - vd: Lop 10 > Toan 10) ----------
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------- KHOA HOC ----------
CREATE TABLE IF NOT EXISTS courses (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  short_desc TEXT,
  description TEXT,
  thumbnail_url TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------- CHUONG ----------
CREATE TABLE IF NOT EXISTS chapters (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------- BAI ----------
CREATE TABLE IF NOT EXISTS lessons (
  id SERIAL PRIMARY KEY,
  chapter_id INTEGER NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT, -- noi dung soan bang CKEditor
  is_preview INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------- 3. VIDEO (nhieu nguon: youtube/vimeo/upload/drive), keo tha sap xep ----------
CREATE TABLE IF NOT EXISTS lesson_videos (
  id SERIAL PRIMARY KEY,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('youtube','vimeo','upload','drive')),
  source_value TEXT NOT NULL, -- id/url tuy loai nguon
  duration_seconds INTEGER,
  position INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------- FILE / PDF dinh kem bai hoc ----------
CREATE TABLE IF NOT EXISTS lesson_files (
  id SERIAL PRIMARY KEY,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'pdf', -- pdf, doc, zip, download...
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------- BAI KIEM TRA (quiz) ----------
CREATE TABLE IF NOT EXISTS quizzes (
  id SERIAL PRIMARY KEY,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  pass_score INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id SERIAL PRIMARY KEY,
  quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS quiz_options (
  id SERIAL PRIMARY KEY,
  question_id INTEGER NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id SERIAL PRIMARY KEY,
  quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  passed INTEGER NOT NULL DEFAULT 0,
  attempted_at TIMESTAMPTZ DEFAULT now()
);

-- ---------- 4. HOC VIEN: ghi danh, tien do, nhat ky hoc ----------
CREATE TABLE IF NOT EXISTS enrollments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  progress_percent INTEGER NOT NULL DEFAULT 0,
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, course_id)
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  is_completed INTEGER NOT NULL DEFAULT 0,
  last_watched_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- ---------- 5. THANH TOAN ----------
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer'
    CHECK (payment_method IN ('vnpay','momo','zalopay','bank_transfer','activation_code')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','failed','cancelled')),
  transaction_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  paid_at TIMESTAMPTZ
);

-- ---------- MA KICH HOAT ----------
CREATE TABLE IF NOT EXISTS activation_codes (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  is_used INTEGER NOT NULL DEFAULT 0,
  used_by_user_id INTEGER REFERENCES users(id),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------- BANNER / TIN TUC ----------
CREATE TABLE IF NOT EXISTS banners (
  id SERIAL PRIMARY KEY,
  image_url TEXT NOT NULL,
  link_url TEXT,
  title TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS news (
  id SERIAL PRIMARY KEY,
  author_id INTEGER REFERENCES users(id),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  thumbnail_url TEXT,
  content TEXT,
  is_published INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------- 8. CHUNG CHI ----------
CREATE TABLE IF NOT EXISTS certificates (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  certificate_code TEXT UNIQUE NOT NULL,
  file_url TEXT,
  issued_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- Bang luu session (dung chung voi connect-pg-simple, tu tao khi khoi dong)

-- ---------- CAI DAT HE THONG (key-value, dung cho cau hinh thanh toan...) ----------
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- ---------- BO SUNG: nhieu dang cau hoi (trac nghiem 1 dap an / dung-sai / tra loi ngan / tu luan) ----------
-- Theo dung cau truc de thi tot nghiep THPT tu 2025 (Quyet dinh 764/QD-BGDDT)
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'single_choice';
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS points NUMERIC(6,2) NOT NULL DEFAULT 0.25;
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS correct_answer TEXT;

-- Cac y (a,b,c,d) trong 1 cau hoi dang Dung/Sai
CREATE TABLE IF NOT EXISTS quiz_tf_items (
  id SERIAL PRIMARY KEY,
  question_id INTEGER NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0
);

-- Diem so gio la so thap phan (0.1 / 0.25 / 0.5...) thay vi so nguyen dem cau dung
ALTER TABLE quiz_attempts ALTER COLUMN score TYPE NUMERIC(6,2) USING score::numeric;
ALTER TABLE quiz_attempts ALTER COLUMN total TYPE NUMERIC(6,2) USING total::numeric;
ALTER TABLE quizzes ALTER COLUMN pass_score TYPE NUMERIC(6,2) USING pass_score::numeric;

-- Luu bai lam tung cau (dac biet la cau tu luan/tra loi ngan can giao vien cham tay)
CREATE TABLE IF NOT EXISTS quiz_attempt_answers (
  id SERIAL PRIMARY KEY,
  attempt_id INTEGER NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  awarded_points NUMERIC(6,2) NOT NULL DEFAULT 0,
  needs_manual_grading INTEGER NOT NULL DEFAULT 0,
  graded_by INTEGER REFERENCES users(id),
  graded_at TIMESTAMPTZ
);

-- ---------- BO SUNG: menu dieu huong tuy chinh + popup quang cao ----------
CREATE TABLE IF NOT EXISTS nav_menu_items (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS popups (
  id SERIAL PRIMARY KEY,
  image_url TEXT NOT NULL,
  link_url TEXT,
  title TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS compare_at_price INTEGER;

-- ---------- BO SUNG: video gioi thieu khoa hoc + doc thu sach + phan loai sach ----------
ALTER TABLE courses ADD COLUMN IF NOT EXISTS intro_video_url TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS preview_url TEXT; -- link PDF doc thu (Google Drive...)
ALTER TABLE books ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL; -- dung chung he thong Lop/Mon voi Khoa hoc
CREATE TABLE IF NOT EXISTS book_types (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE books ADD COLUMN IF NOT EXISTS book_type_id INTEGER REFERENCES book_types(id) ON DELETE SET NULL;

-- ---------- BANG TIN CONG DONG (dang trang thai/anh/video dang link) ----------
CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  image_url TEXT,
  video_url TEXT,          -- link YouTube/Vimeo/bat ky nguon nao, KHONG upload truc tiep
  video_orientation TEXT DEFAULT 'ngang', -- 'ngang' hoac 'doc'
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS post_comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS post_likes (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- ---------- SACH (cung cau truc nhu Khoa hoc, mua chung gio hang) ----------
CREATE TABLE IF NOT EXISTS books (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  author TEXT,
  short_desc TEXT,
  description TEXT,
  cover_url TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  compare_at_price INTEGER,
  file_url TEXT,            -- link file ebook (PDF/Drive...) de tai sau khi mua, khong upload truc tiep
  is_published INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS book_purchases (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, book_id)
);

-- ---------- GIO HANG DUNG CHUNG (khoa hoc + sach mua chung 1 don) ----------
CREATE TABLE IF NOT EXISTS cart_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('course','book')),
  item_id INTEGER NOT NULL,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, item_type, item_id)
);

-- Don hang gio la nhieu san pham (thay vi 1 khoa hoc/don nhu truoc)
ALTER TABLE orders ALTER COLUMN course_id DROP NOT NULL;
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('course','book')),
  item_id INTEGER NOT NULL,
  title_snapshot TEXT,
  price_snapshot INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS recipient_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS recipient_phone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS recipient_address TEXT;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_payment_method_check') THEN
    ALTER TABLE orders DROP CONSTRAINT orders_payment_method_check;
  END IF;
  ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
    CHECK (payment_method IN ('vnpay','momo','zalopay','bank_transfer','activation_code','cod'));
END $$;
