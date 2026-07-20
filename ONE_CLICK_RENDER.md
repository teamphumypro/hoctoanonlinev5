# Bản Render tự khởi phục dependencies

Chỉ cần thay toàn bộ source trong repository và push lên GitHub, sau đó bấm **Manual Deploy → Clear build cache & deploy**.

Bản này tương thích cả khi Render vẫn giữ lệnh cũ `npm install` và `npm run migrate && npm run seed && npm start`: trước migration, hệ thống tự kiểm tra `node_modules`; nếu npm cài thiếu, nó tự chạy lại `npm ci`/`npm install` và chỉ tiếp tục khi đủ thư viện.
