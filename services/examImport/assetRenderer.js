'use strict';

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function renderReferences(input, assets = {}) {
  let html = escapeHtml(input).replace(/\n/g, '<br>');
  html = html.replace(/\[!m:\$([^$\]]+)\$\]/g, (_m, id) => renderMath(id, assets));
  html = html.replace(/\[\[MATH:([^\]]+)\]\]/g, (_m, id) => renderMath(id, assets));
  html = html.replace(/\[(?:img|!img):\$([^$\]]+)\$\]/g, (_m, id) => renderImage(id, assets));
  html = html.replace(/\[\[IMG:([^\]]+)\]\]/g, (_m, id) => renderImage(id, assets));
  return html;
}

function renderMath(id, assets) {
  const asset = assets.maths && assets.maths[id];
  if (!asset) return `<span class="exam-missing-asset" title="Thiếu công thức ${escapeHtml(id)}">[⚠ công thức]</span>`;
  if (asset.mathml) return `<span class="exam-math" data-ref="${escapeHtml(id)}">${asset.mathml}</span>`;
  if (asset.dataUrl) return `<img class="exam-math-img" data-ref="${escapeHtml(id)}" src="${asset.dataUrl}" alt="Công thức toán">`;
  return `<span class="exam-missing-asset">[⚠ công thức]</span>`;
}

function renderImage(id, assets) {
  const asset = assets.images && assets.images[id];
  if (!asset || !asset.dataUrl) return `<span class="exam-missing-asset" title="Thiếu ảnh ${escapeHtml(id)}">[⚠ hình ảnh]</span>`;
  return `<img class="exam-content-img" data-ref="${escapeHtml(id)}" src="${asset.dataUrl}" alt="Hình minh họa">`;
}

module.exports = { renderReferences, escapeHtml };
