# Fix Render: npm install lỗi và thiếu dotenv

Render phải dùng:

- Build Command: `rm -rf node_modules && npm ci --omit=dev --no-audit --no-fund`
- Start Command: `npm run migrate && npm run seed && npm start`
- Node: `20.20.2`

Bản này cũng cho phép server dùng trực tiếp biến môi trường của Render khi module `dotenv` không có, thay vì dừng ở bước migrate.

Sau khi push GitHub: Manual Deploy -> Clear build cache & deploy.
