/*
 * ImportResult - dinh nghia cau truc tra ve THONG NHAT cua ImportEngine.import(), khong phu thuoc
 * file dau vao la Word/PDF/HTML gi - phia LMS chi can lam viec voi cau truc nay.
 */
function buildImportResult({ title, sections, questions, assets, solutions, rubrics, summary }) {
  return {
    title: title || '',
    sections: sections || [],
    questions: questions || [],
    assets: assets || [],
    solutions: solutions || [],
    rubrics: rubrics || [],
    summary: summary || { total: 0, needsReview: 0, byType: {} }
  };
}

module.exports = { buildImportResult };
