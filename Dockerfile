# QUAN TRONG: LibreOffice o day GIO LA DUONG CHINH (khong con la tuy chon) de chuyen doi cong
# thuc MathType dang WMF/EMF sang PNG dung noi dung (bao gom ca chu so/ky hieu, khong chi net ve).
# Thu vien JS thuan (emf-converter) tung duoc uu tien nhung gay loi thuc te: no ve duoc net vector
# nhung bo qua record van ban trong WMF, ra anh cong thuc chi con net rac, mat het noi dung -
# xem FIX-CONG-THUC-WMF-V2.md. Neu KHONG dung Dockerfile nay (deploy Node thuong, khong Docker),
# he thong se tu dong quay ve dung thu vien JS thuan (chat luong kem hon, xem ghi chu trong
# services/examImport/docxRichExtractor.js) - van chay duoc nhung cong thuc WMF/EMF co the bi loi
# hien thi.
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
