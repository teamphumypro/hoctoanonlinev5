# Dockerfile nay GIO LA TUY CHON, khong bat buoc nua — he thong da chuyen sang dung thu vien
# JS thuan (emf-converter + @napi-rs/canvas) de doc cong thuc dang WMF/EMF, khong can LibreOffice
# nua trong da so truong hop. Dockerfile nay chi con dung lam PHUONG AN DU PHONG cho nhung file WMF
# hiem gap ma thu vien JS chua xu ly duoc — neu ban van dang deploy kieu Node binh thuong (khong
# dung Dockerfile nay), moi thu van hoat dong binh thuong.
FROM node:20-slim

# Cai dat LibreOffice (chi phan can, khong cai full bo Office de do nang) de chuyen doi WMF -> PNG
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice-core \
    libreoffice-draw \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .

EXPOSE 3000
CMD ["sh", "-c", "npm run migrate && npm run seed && npm start"]
