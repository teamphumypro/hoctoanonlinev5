'use strict';
const fs = require('fs');

async function extractDocxAzota(filePath) {
  const JSZip = require('jszip');
  const { XMLParser } = require('fast-xml-parser');
  const { ommlNodeToMathml } = require('./ommlToMathml');
  const zip = await JSZip.loadAsync(fs.readFileSync(filePath));
  const documentFile = zip.file('word/document.xml');
  if (!documentFile) throw new Error('DOCX không có word/document.xml');

  const relMap = await readRelationships(zip, XMLParser);
  const converted = await convertVectorAssets(zip, relMap);
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', preserveOrder: true, trimValues: false });
  const parsed = parser.parse(await documentFile.async('string'));
  const assets = { maths: {}, images: {}, tables: {} };
  let mathNo = 0; let imageNo = 0; let tableNo = 0; let rawText = '';

  const findRelId = node => {
    if (Array.isArray(node)) { for (const item of node) { const v = findRelId(item); if (v) return v; } }
    else if (node && typeof node === 'object') {
      if (node[':@']) for (const [key, val] of Object.entries(node[':@'])) if (key.endsWith(':embed') || key.endsWith(':id')) return val;
      for (const [key, val] of Object.entries(node)) { if (key !== ':@') { const v = findRelId(val); if (v) return v; } }
    }
    return null;
  };

  const textOf = content => {
    if (typeof content === 'string') return content;
    if (Array.isArray(content) && content[0] && Object.prototype.hasOwnProperty.call(content[0], '#text')) return String(content[0]['#text'] || '');
    return '';
  };

  async function addGraphic(content, kindHint = '') {
    const rid = findRelId(content); if (!rid || !relMap[rid]) return '';
    const target = normalizeTarget(relMap[rid]);
    const file = zip.file(target); if (!file && !converted[target]) return '';
    const ext = (target.split('.').pop() || 'png').toLowerCase();
    const isFormula = /object|ole|equation/i.test(kindHint) || ext === 'wmf' || ext === 'emf';
    if (isFormula) {
      const id = `mathtype_${++mathNo}`;
      let dataUrl = null;
      if (converted[target]) dataUrl = `data:image/png;base64,${converted[target]}`;
      else if (file) {
        const b64 = await file.async('base64');
        const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext === 'svg' ? 'svg+xml' : ext}`;
        dataUrl = `data:${mime};base64,${b64}`;
      }
      assets.maths[id] = { id, sourceType: ext, dataUrl };
      return `[!m:$${id}$]`;
    }
    const id = `img_${++imageNo}`;
    const b64 = await file.async('base64');
    const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'svg' ? 'image/svg+xml' : `image/${ext}`;
    assets.images[id] = { id, sourceType: ext, dataUrl: `data:${mime};base64,${b64}` };
    return `[img:$${id}$]`;
  }

  async function serializeTable(content) {
    const id = `table_${++tableNo}`;
    const rows = [];
    async function collect(node) {
      if (!Array.isArray(node)) return;
      for (const entry of node) {
        const tag = Object.keys(entry).find(k => k !== ':@'); const value = entry[tag];
        if (tag === 'w:tr') {
          const cells = [];
          for (const child of value || []) if (child['w:tc']) cells.push((await serialize(child['w:tc'])).trim());
          rows.push(cells);
        }
      }
    }
    await collect(content);
    assets.tables[id] = { id, rows };
    return rows.map(r => `| ${r.join(' | ')} |`).join('\n');
  }

  async function serialize(nodeArray) {
    let out = '';
    if (!Array.isArray(nodeArray)) return out;
    for (const node of nodeArray) {
      const tag = Object.keys(node).find(k => k !== ':@'); if (!tag) continue;
      const content = node[tag];
      if (tag === 'w:t' || tag === 'w:instrText') out += textOf(content);
      else if (tag === 'w:tab') out += '\t';
      else if (tag === 'w:br' || tag === 'w:cr') out += '\n';
      else if (tag === 'm:oMath' || tag === 'm:oMathPara') {
        const id = `mathtype_${++mathNo}`;
        const mathml = ommlNodeToMathml(content);
        assets.maths[id] = { id, sourceType: 'omml', mathml: mathml || null };
        out += `[!m:$${id}$]`;
      } else if (tag === 'w:drawing' || tag === 'w:pict') out += await addGraphic(content, 'drawing');
      else if (tag === 'w:object') out += await addGraphic(content, 'object');
      else if (tag === 'w:tbl') out += `\n${await serializeTable(content)}\n`;
      else if (tag === 'w:p') out += `${await serialize(content)}\n`;
      else if (Array.isArray(content)) out += await serialize(content);
    }
    return out;
  }

  async function findBody(node) {
    if (Array.isArray(node)) for (const item of node) { const result = await findBody(item); if (result != null) return result; }
    else if (node && typeof node === 'object') {
      if (node['w:body']) return serialize(node['w:body']);
      for (const [key, value] of Object.entries(node)) if (key !== ':@') { const result = await findBody(value); if (result != null) return result; }
    }
    return null;
  }
  rawText = await findBody(parsed) || '';
  rawText = rawText.replace(/\u00a0/g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return { rawText, assets, format: 'docx' };
}

async function readRelationships(zip, XMLParser) {
  const map = {}; const file = zip.file('word/_rels/document.xml.rels'); if (!file) return map;
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const parsed = parser.parse(await file.async('string'));
  const rows = parsed.Relationships && parsed.Relationships.Relationship;
  for (const row of (Array.isArray(rows) ? rows : rows ? [rows] : [])) if (row['@_Id'] && row['@_Target']) map[row['@_Id']] = row['@_Target'];
  return map;
}
function normalizeTarget(target) {
  const clean = String(target).replace(/^\.\.\//, '');
  return clean.startsWith('word/') ? clean : clean.startsWith('media/') || clean.startsWith('embeddings/') ? `word/${clean}` : `word/${clean}`;
}
async function convertVectorAssets(zip, relMap) {
  const targets = [...new Set(Object.values(relMap).filter(v => /\.(wmf|emf)$/i.test(v)).map(normalizeTarget))];
  const output = {}; if (!targets.length) return output;
  try {
    if (typeof global.FileReader === 'undefined') {
      global.FileReader = class FileReader {
        readAsArrayBuffer(blob) { Promise.resolve(blob.arrayBuffer ? blob.arrayBuffer() : blob).then(v => { this.result = v; if (this.onload) this.onload({ target: this }); }).catch(e => this.onerror && this.onerror(e)); }
      };
    }
    const { convertWmfToDataUrl, convertEmfToDataUrl } = require('emf-converter');
    const canvas = require('@napi-rs/canvas');
    if (!global.OffscreenCanvas) global.OffscreenCanvas = canvas.Canvas;
    for (const target of targets) {
      const file = zip.file(target); if (!file) continue;
      try {
        const arrayBuffer = await file.async('arraybuffer');
        const url = /\.emf$/i.test(target) ? await convertEmfToDataUrl(arrayBuffer) : await convertWmfToDataUrl(arrayBuffer);
        if (url && url.includes(',')) output[target] = url.split(',')[1];
      } catch (error) { console.warn('[exam-import] vector conversion failed:', target, error.message); }
    }
  } catch (error) { console.warn('[exam-import] vector converter unavailable:', error.message); }
  return output;
}
module.exports = { extractDocxAzota };
