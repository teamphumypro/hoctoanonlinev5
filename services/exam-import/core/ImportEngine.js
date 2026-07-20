/*
 * ImportEngine - diem vao DUY NHAT cua module nhap de:
 *
 *   const exam = await ExamImportEngine.import(filePath);
 *
 * Ben trong dieu phoi: Reader (doc file tho) -> Extractor (cong thuc/anh, chay ben trong Reader) ->
 * Analyzer (tach cau/dap an/loi giai) -> Render (thay token thanh HTML that) -> Validator (kiem tra
 * + gan needsReview) -> ImportResult (dong goi cau truc thong nhat).
 *
 * Controller/LMS phia tren KHONG can biet file dau vao la Word/PDF/HTML gi, chi lam viec voi ket
 * qua tra ve thong nhat {title, sections, questions, assets, solutions, rubrics, summary}.
 *
 * Thuat toan tach cau/dap an ben trong da duoc KIEM CHUNG THUC TE tren file de thi that (22/22 cau
 * dung ca loai lan dap an) - xem tests/ o thu muc goc du an (examAssembler.test.js va cac test lien
 * quan) truoc khi module nay duoc tai cau truc sang day.
 */
const path = require('path');
const { readDocx } = require('../readers/DocxReader');
const { normalizeText, findSectionHeaders } = require('../analyzers/SectionDetector');
const { findQuestionMarkers, splitExamAndSolution } = require('../analyzers/QuestionDetector');
const { splitQuestionBody } = require('../analyzers/QuestionTypeDetector');
const { detectAnswers } = require('../analyzers/AnswerDetector');
const { detectSolutionBlocks } = require('../analyzers/SolutionDetector');
const { restoreImages } = require('../render/HtmlRenderer');
const { sanitizePlaceholders } = require('../render/PlaceholderRenderer');
const { validate } = require('../validator/Validator');
const { buildImportResult } = require('./ImportResult');

function renderBlock(raw, images) {
  const withImages = restoreImages(raw, images);
  return sanitizePlaceholders(withImages).text;
}

function guessTitle(examText) {
  const firstLine = examText.split('\n').map(l => l.trim()).find(l => l.length > 0);
  return firstLine || '';
}

async function importDocx(filePath, images_unused) {
  const { text, images } = await readDocx(filePath);
  const normalized = normalizeText(text);
  const { examText, solutionText } = splitExamAndSolution(normalized);

  const sectionHeaders = findSectionHeaders(examText);
  const markers = findQuestionMarkers(examText);
  const answers = detectAnswers(solutionText);
  const solutionBlocks = detectSolutionBlocks(solutionText);

  const questions = markers.map((marker, i) => {
    const end = i + 1 < markers.length ? markers[i + 1].start : examText.length;
    // Cau cuoi cung cua 1 phan khong duoc keo theo tieu de "PHAN..." ke tiep vao than cau.
    const nextSection = sectionHeaders.find(s => s.index > marker.contentStart && s.index < end);
    const body = examText.slice(marker.contentStart, nextSection ? nextSection.index : end);

    const section = [...sectionHeaders].reverse().find(s => s.index <= marker.start);
    const sectionNo = section ? section.number : 0;

    const split = splitQuestionBody(body);

    const sectionAnswers = answers[sectionNo] || answers[0] || {};
    const rawAnswer = sectionAnswers[marker.number];

    let correctIndex = null, correctFlags = null, correctAnswerText = null;
    if (split.type === 'single_choice' && typeof rawAnswer === 'string' && /^[A-H]$/.test(rawAnswer)) {
      correctIndex = rawAnswer.charCodeAt(0) - 65;
    } else if (split.type === 'true_false' && Array.isArray(rawAnswer)) {
      correctFlags = rawAnswer;
    } else if (split.type === 'short_answer' && rawAnswer != null && !Array.isArray(rawAnswer)) {
      correctAnswerText = String(rawAnswer);
    }

    const solutionRaw = (solutionBlocks[sectionNo] || solutionBlocks[0] || {})[marker.number];

    return {
      section: sectionNo,
      number: marker.number,
      type: split.type,
      stem: renderBlock(split.stem, images),
      options: split.options.map(o => ({ label: o.label, text: renderBlock(o.text, images) })),
      correctIndex,
      correctFlags,
      correctAnswerText,
      explanation: solutionRaw ? renderBlock(solutionRaw, images) : ''
    };
  });

  const { questions: validated, summary } = validate(questions);

  const sectionsOut = [...new Set(validated.map(q => q.section))].sort((a, b) => a - b).map(number => ({
    number,
    questionCount: validated.filter(q => q.section === number).length
  }));

  return buildImportResult({
    title: guessTitle(examText),
    sections: sectionsOut,
    questions: validated,
    assets: images,
    solutions: [], // van ban loi giai da duoc gan truc tiep vao tung cau (question.explanation)
    rubrics: [], // chua ho tro - xem ghi chu trong README cua module nay
    summary
  });
}

async function importFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.docx') return importDocx(filePath);
  // PDF/HTML reader chua duoc xay dung trong kien truc V4 nay - bao loi ro rang thay vi gia vo ho tro.
  throw new Error(`Chưa hỗ trợ định dạng "${ext}" trong kiến trúc nhập đề mới. Hiện chỉ hỗ trợ .docx.`);
}

module.exports = { import: importFile };
