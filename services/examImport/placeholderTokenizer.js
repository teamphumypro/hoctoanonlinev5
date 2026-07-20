'use strict';

const REF_PATTERNS = [
  { type: 'math', re: /\[!m:\$([^$\]]+)\$\]/g },
  { type: 'image', re: /\[(?:img|!img):\$([^$\]]+)\$\]/g },
  { type: 'math', re: /\[\[MATH:([^\]]+)\]\]/g },
  { type: 'image', re: /\[\[IMG:([^\]]+)\]\]/g }
];

function tokenizeReferences(input) {
  let text = String(input || '');
  const refs = [];
  for (const pattern of REF_PATTERNS) {
    text = text.replace(pattern.re, (raw, id) => {
      const token = `\uE000REF_${refs.length}\uE001`;
      refs.push({ token, raw, type: pattern.type, id: String(id).trim() });
      return token;
    });
  }
  return {
    text,
    refs,
    restore(value) {
      let output = String(value || '');
      for (const ref of refs) output = output.split(ref.token).join(ref.raw);
      return output;
    }
  };
}

function splitInlineBlocks(input) {
  const text = String(input || '');
  const combined = /(\[!m:\$[^$\]]+\$\]|\[(?:img|!img):\$[^$\]]+\$\]|\[\[MATH:[^\]]+\]\]|\[\[IMG:[^\]]+\]\])/g;
  const blocks = [];
  let cursor = 0;
  let match;
  while ((match = combined.exec(text))) {
    if (match.index > cursor) blocks.push({ type: 'text', value: text.slice(cursor, match.index) });
    const raw = match[0];
    let type = 'text'; let id = '';
    let m = raw.match(/^\[!m:\$([^$\]]+)\$\]$/) || raw.match(/^\[\[MATH:([^\]]+)\]\]$/);
    if (m) { type = 'math_reference'; id = m[1]; }
    else {
      m = raw.match(/^\[(?:img|!img):\$([^$\]]+)\$\]$/) || raw.match(/^\[\[IMG:([^\]]+)\]\]$/);
      if (m) { type = 'image_reference'; id = m[1]; }
    }
    blocks.push({ type, referenceId: id, raw });
    cursor = match.index + raw.length;
  }
  if (cursor < text.length) blocks.push({ type: 'text', value: text.slice(cursor) });
  return blocks;
}

module.exports = { tokenizeReferences, splitInlineBlocks };
