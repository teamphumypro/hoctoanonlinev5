/*
 * Loc HTML noi dung bai lam tu luan cua HOC SINH truoc khi luu vao CSDL, vi noi dung nay se duoc
 * hien thi lai duoi dang HTML (khong escape) cho GIAO VIEN xem khi cham bai - neu khong loc, hoc
 * sinh co the chen script/the nguy hiem vao bai lam de tan cong tai khoan giao vien (stored XSS).
 *
 * QUAN TRONG - GIOI HAN THAT SU: day la bo loc dua tren regex (allowlist the/thuoc tinh), khong
 * phai trinh phan tich HTML/DOM chuan (khong co thu vien sanitize-html/DOMPurify trong du an vi
 * moi truong phat trien khong co mang de cai them goi). Bo loc dua tren regex CO THE co truong hop
 * bien hiem gap ma HTML that di lech chuan bi lot qua (vi du the long nhau bat thuong). Neu co dieu
 * kien mang, NEN THAY THE bang thu vien "sanitize-html" that su thay vi bo nay - xem ghi chu cuoi
 * file. Trong luc chua co, day la lop bao ve tot nhat co the lam duoc, hon la khong loc gi ca.
 */

const ALLOWED_TAGS = new Set(['p', 'br', 'span', 'div', 'sup', 'sub', 'strong', 'em', 'u', 'b', 'i', 'img']);
const DANGEROUS_TAGS_STRIP_CONTENT = ['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta', 'form', 'svg', 'math'];

function stripDangerousTagsWithContent(html) {
  let out = html;
  for (const tag of DANGEROUS_TAGS_STRIP_CONTENT) {
    const re = new RegExp('<' + tag + '\\b[^>]*>[\\s\\S]*?</' + tag + '\\s*>', 'gi');
    out = out.replace(re, '');
    const selfClose = new RegExp('<' + tag + '\\b[^>]*/?>', 'gi');
    out = out.replace(selfClose, '');
  }
  return out;
}

function sanitizeAttributes(tagName, attrString) {
  const kept = [];
  const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let m;
  while ((m = attrRe.exec(attrString))) {
    const name = m[1].toLowerCase();
    const value = (m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : m[5] || '').trim();

    if (name.startsWith('on')) continue;
    if (name === 'style') continue;

    if (tagName === 'img' && name === 'src') {
      if (/^data:image\/(png|jpeg|jpg|gif|webp);base64,/i.test(value)) kept.push(`src="${value}"`);
      continue;
    }
    if (name === 'href' || name === 'src' || name === 'xlink:href' || name === 'action' || name === 'formaction') {
      continue;
    }
    if (name === 'class' || name === 'contenteditable') continue;

    if (/^[a-zA-Z0-9 %._-]*$/.test(value)) kept.push(`${name}="${value.replace(/"/g, '&quot;')}"`);
  }
  return kept.length ? ' ' + kept.join(' ') : '';
}

function sanitizeEssayHtml(rawHtml) {
  if (!rawHtml) return '';
  let html = String(rawHtml).slice(0, 200000);

  html = stripDangerousTagsWithContent(html);
  html = html.replace(/<!--[\s\S]*?-->/g, '');

  html = html.replace(/<\/?([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^<>]*)?)\/?>/g, (match, tagRaw, attrString) => {
    const tag = tagRaw.toLowerCase();
    const isClosing = match.startsWith('</');
    if (!ALLOWED_TAGS.has(tag)) return '';
    if (isClosing) return `</${tag}>`;
    const safeAttrs = sanitizeAttributes(tag, attrString || '');
    return `<${tag}${safeAttrs}>`;
  });

  return html.trim();
}

module.exports = { sanitizeEssayHtml };
