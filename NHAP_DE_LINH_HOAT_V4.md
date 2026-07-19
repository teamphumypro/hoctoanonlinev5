# Nhập đề linh hoạt V4 – sửa nhận diện phương án cùng dòng

Bản V4 sửa lỗi quan trọng khi đọc Word: các phương án A, B, C, D thường nằm trên cùng một dòng hoặc cùng một paragraph. Parser cũ chỉ nhận A/B/C/D khi bắt đầu dòng nên câu trắc nghiệm bị chuyển nhầm thành tự luận.

## Cơ chế mới

- Nhận phương án đặt cùng dòng: `A. ... B. ... C. ... D. ...`
- Nhận phương án xuống dòng hoặc trộn cả hai cách.
- Nhận số phương án động A–H.
- Chỉ tách khi tìm được chuỗi nhãn tăng dần bắt đầu từ A, giúp tránh nhầm chữ `điểm A.` trong thân câu hỏi.
- Công thức và hình ảnh nằm giữa câu/phương án vẫn được giữ nguyên.
- Dạng câu được xác định sau khi tách phương án, nên các câu đầu của đề Word mẫu được nhận là `single_choice`, không còn thành `essay`.
