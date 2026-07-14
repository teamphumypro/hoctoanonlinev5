// Nhan dien de thi bang AI (Claude) - thong minh hon regex, xu ly duoc de trinh bay
// khong theo khuon mau, nhung van CAN nguoi dung xem lai truoc khi luu (khong tin tuyet doi).
const axios = require('axios');

const SYSTEM_PROMPT = `Bạn là trợ lý trích xuất câu hỏi thi. Nhận vào văn bản thô của một đề thi tiếng Việt,
hãy trả về DUY NHẤT một mảng JSON (không kèm giải thích, không markdown, không dấu backtick),
mỗi phần tử là 1 câu hỏi theo đúng 1 trong 4 cấu trúc sau:

1. Trắc nghiệm 1 đáp án đúng:
{"type":"single_choice","question":"...","points":0.25,"options":["...","...","...","..."],"correctIndex":0}

2. Đúng/Sai nhiều ý (thường 4 ý a,b,c,d):
{"type":"true_false","question":"...","points":1,"items":[{"content":"...","correct":true},{"content":"...","correct":false}]}

3. Trả lời ngắn (thí sinh tự điền đáp án, thường là số hoặc chuỗi ngắn):
{"type":"short_answer","question":"...","points":0.25,"correct_answer":"..."}

4. Tự luận (bài viết dài, không có đáp án cố định, cần giáo viên chấm tay):
{"type":"essay","question":"...","points":2}

Quy tắc:
- Giữ nguyên công thức toán/ký hiệu dưới dạng text/LaTeX nếu có trong văn bản gốc, không tự bịa hoặc tự sửa nội dung.
- Nếu không xác định được đáp án đúng, vẫn trả về câu hỏi đó nhưng để correctIndex:-1 hoặc correct_answer:"" (đừng đoán bừa).
- Nếu văn bản có sẵn phần "ĐÁP ÁN" ở cuối, hãy dùng nó để gán đáp án đúng cho đúng câu tương ứng.
- Chỉ trả về mảng JSON hợp lệ, không có bất kỳ chữ nào khác bên ngoài mảng.`;

async function parseExamTextWithAI({ text, apiKey, model }) {
  if (!apiKey) throw new Error('Chưa cấu hình Anthropic API Key.');
  const usedModel = model || 'claude-sonnet-5';

  // Cat bot neu van ban qua dai (gioi han an toan cho 1 lan goi)
  const trimmedText = text.length > 60000 ? text.slice(0, 60000) : text;

  const response = await axios.post('https://api.anthropic.com/v1/messages', {
    model: usedModel,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Văn bản đề thi:\n\n${trimmedText}` }]
  }, {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    timeout: 120000
  });

  const textBlock = (response.data.content || []).find(b => b.type === 'text');
  if (!textBlock) throw new Error('AI không trả về nội dung văn bản.');

  let jsonStr = textBlock.text.trim();
  // Phong truong hop AI lo boc trong ```json ... ```
  jsonStr = jsonStr.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');

  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error('AI trả về dữ liệu không đúng định dạng JSON. Vui lòng thử lại hoặc dùng chế độ nhận diện thường.');
  }
  if (!Array.isArray(parsed)) throw new Error('AI không trả về danh sách câu hỏi hợp lệ.');

  // Chuan hoa lai field name cho khop voi phan con lai cua he thong (correct_answer, items[].is_correct)
  return parsed.map(q => {
    if (q.type === 'true_false' && Array.isArray(q.items)) {
      q.items = q.items.map(it => ({ content: it.content, is_correct: !!it.correct }));
    }
    return q;
  });
}

module.exports = { parseExamTextWithAI };
