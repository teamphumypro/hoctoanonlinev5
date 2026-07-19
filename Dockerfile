# Dockerfile nay CHI can thiet neu ban muon he thong tu hien thi dung cac cong thuc Toan/Ly/Hoa
# duoc chen bang MathType kieu cu (dinh dang OLE + anh xem truoc WMF) - day la dinh dang pho bien
# nhat trong de thi tieng Viet hien nay. Neu khong dung Dockerfile nay (van deploy kieu Node binh
# thuong nhu truoc), moi thu khac VAN CHAY BINH THUONG, chi rieng cong thuc dang WMF se khong hien
# duoc thanh anh (se hien placeholder chu "[cong thuc]" de ban tu sua tay).
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
