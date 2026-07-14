const bcrypt = require('bcryptjs');
const User = require('../models/User');
const LoginLog = require('../models/LoginLog');

exports.showLogin = (req, res) => res.render('login', { error: null });
exports.showRegister = (req, res) => res.render('register', { error: null });

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.render('register', { error: 'Vui lòng nhập đầy đủ thông tin.' });
    const existing = await User.findByEmail(email);
    if (existing) return res.render('register', { error: 'Email này đã được đăng ký.' });
    const hash = bcrypt.hashSync(password, 10);
    const user = await User.create({ name, email, password_hash: hash, role: 'student' });
    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role, avatar_url: user.avatar_url };
    res.redirect('/tai-khoan');
  } catch (err) {
    console.error(err);
    res.render('register', { error: 'Có lỗi xảy ra, vui lòng thử lại.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findByEmail(email);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.render('login', { error: 'Email hoặc mật khẩu không đúng.' });
    }
    if (!user.is_active) return res.render('login', { error: 'Tài khoản của bạn đã bị khóa.' });
    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role, avatar_url: user.avatar_url };
    await LoginLog.record(user.id, req.ip, req.headers['user-agent']);
    res.redirect('/tai-khoan');
  } catch (err) {
    console.error(err);
    res.render('login', { error: 'Có lỗi xảy ra, vui lòng thử lại.' });
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => res.redirect('/'));
};

// ---- Admin (giang vien/quan tri) dang nhap rieng o /admin ----
exports.showAdminLogin = (req, res) => res.render('admin/login', { error: null });

exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findByEmail(email);
    if (!user || user.role === 'student' || !bcrypt.compareSync(password, user.password_hash)) {
      return res.render('admin/login', { error: 'Email hoặc mật khẩu không đúng.' });
    }
    req.session.adminUser = { id: user.id, name: user.name, email: user.email, role: user.role };
    await LoginLog.record(user.id, req.ip, req.headers['user-agent']);
    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    res.render('admin/login', { error: 'Có lỗi xảy ra, vui lòng thử lại.' });
  }
};

exports.adminLogout = (req, res) => {
  delete req.session.adminUser;
  res.redirect('/admin/dang-nhap');
};
