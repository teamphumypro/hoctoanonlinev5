# AST V5 – DOCX → AST → Editor → Student Workspace → Rubric

## Kiến trúc

- `services/exam-ast/readers/DocxAstReader.js`: đọc XML DOCX thành node `paragraph`, `text`, `math`, `image`, `table`.
- `services/exam-ast/analyzers/QuestionAstAnalyzer.js`: nhận diện phần/câu/đáp án/lời giải và gắn AST cho từng câu.
- `services/exam-ast/renderers/AstHtmlRenderer.js`: renderer duy nhất cho giao diện web.
- `views/admin/quizzes/import-review.ejs`: editor AST và tạo rubric.
- `public/js/math-essay-editor.js`: học sinh làm tự luận bằng text + math + drawing + image.
- `views/admin/quizzes/results.ejs`: giáo viên chấm theo rubric.

## Database

Migration tự thêm:

- `quiz_questions.ast_json`
- `quiz_questions.rubric_json`
- `quiz_attempt_answers.rubric_scores`

## AI

Chưa tự động gọi AI để quyết định điểm. Dữ liệu AST, bài làm block và rubric đã sẵn sàng để đưa vào AI ở bước tiếp theo, giáo viên vẫn là người duyệt điểm cuối.
