# Bản sửa lỗi deploy Render

Bản này đã khóa môi trường ổn định để tránh lỗi npm `Exit handler never called!` trên Node.js 24.

## Các thay đổi

- Khóa Node.js ở phiên bản `20.18.0` bằng `.node-version`, `.nvmrc`, `package.json` và `render.yaml`.
- Khóa npm ở nhánh `10.x`.
- Sửa toàn bộ đường dẫn tải package trong `package-lock.json` về registry công khai `https://registry.npmjs.org/`.
- Render Build Command: `npm ci --omit=dev`.
- Render Start Command: `npm run migrate && npm start`.
- Giữ nguyên toàn bộ tính năng nhập đề Thực chiến phòng thi đã sửa theo video.

## Sau khi đẩy code lên GitHub

Trong Render chọn **Manual Deploy → Clear build cache & deploy**.

Nếu service cũ không tự đọc `render.yaml`, đặt thủ công:

- Environment: `NODE_VERSION = 20.18.0`
- Build Command: `npm ci --omit=dev`
- Start Command: `npm run migrate && npm start`

Không chạy `npm run seed` ở mỗi lần deploy để tránh tạo lại dữ liệu mẫu.
