'use strict';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function renderInline(n) {
  if (!n) return '';
  if (n.type === 'text') return esc(n.text).replace(/\n/g, '<br>');
  if (n.type === 'tab') return '<span class="ast-tab">&emsp;</span>';
  if (n.type === 'break') return '<br>';
  if (n.type === 'math') {
    if (n.mathml) return `<span class="ast-math ast-mathml">${n.mathml}</span>`;
    if (n.dataUrl) return `<img class="ast-math-img" src="${esc(n.dataUrl)}" alt="Công thức toán">`;
    return '<span class="ast-missing">[Công thức]</span>';
  }
  if (n.type === 'image') return n.dataUrl ? `<img class="ast-image" src="${esc(n.dataUrl)}" alt="Hình trong đề">` : '<span class="ast-missing">[Hình]</span>';
  return '';
}
function renderBlock(b) {
  if (!b) return '';
  if (b.type === 'paragraph') return `<div class="ast-paragraph">${(b.children||[]).map(renderInline).join('')}</div>`;
  if (b.type === 'table') return `<table class="ast-table"><tbody>${(b.rows||[]).map(r=>`<tr>${r.map(c=>`<td>${(c.blocks||[]).map(renderBlock).join('')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  return '';
}
function renderBlocks(blocks){ return (blocks||[]).map(renderBlock).join(''); }
function plainInline(n){ if(!n)return''; if(n.type==='text')return n.text; if(n.type==='tab')return'\t'; if(n.type==='break')return'\n'; if(n.type==='math')return `⟦MATH:${n.id}⟧`; if(n.type==='image')return `⟦IMAGE:${n.id}⟧`; return''; }
function plainBlocks(blocks){return (blocks||[]).map(b=>b.type==='paragraph'?(b.children||[]).map(plainInline).join(''):b.type==='table'?(b.rows||[]).map(r=>'| '+r.map(c=>plainBlocks(c.blocks)).join(' | ')+' |').join('\n'):'').join('\n');}
module.exports={renderBlocks,renderBlock,renderInline,plainBlocks};
