/*
 * DocxReader - doc file .docx theo DUNG THU TU trong tai lieu (van ban + cong thuc + anh nhung),
 * de ghep dung vi tri cong thuc/anh vao giua cau chu. Day la tang thap nhat cua ImportEngine -
 * chi doc va tra ve du lieu tho ({text, images}), khong tach cau/dap an (viec do thuoc analyzers/).
 *
 * Module doc lap voi services/examImport/docxRichExtractor.js (van dung rieng cho tinh nang
 * "Doc sach online" - khong dung chung de tach biet hoan toan 2 module, tranh sua 1 noi anh huong
 * tinh nang khac).
 */
const fs = require('fs');
const { ommlNodeToMathml } = require('../extractors/ommlToMathml');
const { convertFormulaImages } = require('../extractors/MathExtractor');

async function readDocx(filePath) {
  const JSZip = require('jszip');
  const { XMLParser } = require('fast-xml-parser');

  const buffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);

  const docFile = zip.file('word/document.xml');
  if (!docFile) throw new Error('Không đọc được cấu trúc file docx');
  const documentXml = await docFile.async('string');

  const relMap = {};
  const relsFile = zip.file('word/_rels/document.xml.rels');
  if (relsFile) {
    const relsXml = await relsFile.async('string');
    const relParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    const relsDoc = relParser.parse(relsXml);
    const relsRoot = relsDoc.Relationships;
    if (relsRoot && relsRoot.Relationship) {
      const arr = Array.isArray(relsRoot.Relationship) ? relsRoot.Relationship : [relsRoot.Relationship];
      arr.forEach(r => { if (r['@_Id'] && r['@_Target']) relMap[r['@_Id']] = r['@_Target']; });
    }
  }

  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', preserveOrder: true, trimValues: false });
  const parsedDoc = parser.parse(documentXml);

  // Chuyen doi hang loat cong thuc WMF/EMF TRUOC KHI duyet van ban (tranh mo LibreOffice nhieu lan)
  const wmfConvertedMap = await convertFormulaImages(zip, relMap);

  const images = [];
  let text = '';

  function findEmbedId(node) {
    if (Array.isArray(node)) {
      for (const item of node) {
        const found = findEmbedId(item);
        if (found) return found;
      }
      return null;
    }
    if (node && typeof node === 'object') {
      if (node[':@']) {
        const attrs = node[':@'];
        for (const key of Object.keys(attrs)) {
          if (key.endsWith(':embed') || key.endsWith(':id') || key === '@_r:embed' || key === '@_r:id') return attrs[key];
        }
      }
      for (const key of Object.keys(node)) {
        if (key === ':@') continue;
        const found = findEmbedId(node[key]);
        if (found) return found;
      }
    }
    return null;
  }

  async function addImageFromEmbedId(embedId) {
    const { extractImageByEmbedId } = require('../extractors/ImageExtractor');
    const found = await extractImageByEmbedId(zip, relMap, embedId);
    if (!found) return;

    if (found.isFormula) {
      const converted = wmfConvertedMap[found.imgPath];
      if (converted) {
        const idx = images.length;
        images.push(`data:image/png;base64,${converted}`);
        text += `[[IMG:${idx}]]`;
      } else {
        text += ' [công thức - chưa hiển thị được, vui lòng sửa tay] ';
      }
      return;
    }

    const idx = images.length;
    images.push(found.dataUrl);
    text += `[[IMG:${idx}]]`;
  }

  async function walk(nodeArr) {
    if (!Array.isArray(nodeArr)) return;
    for (const node of nodeArr) {
      const tag = Object.keys(node).find(k => k !== ':@');
      if (!tag) continue;
      const content = node[tag];

      if (tag === 'w:t') {
        const raw = Array.isArray(content) && content[0] ? content[0]['#text'] : content;
        text += (typeof raw === 'string' ? raw : (raw != null ? String(raw) : ''));
      } else if (tag === 'm:oMath' || tag === 'm:oMathPara') {
        const mathml = ommlNodeToMathml(content);
        if (mathml) text += `[[MATH:${encodeURIComponent(mathml)}]]`;
      } else if (tag === 'w:drawing' || tag === 'w:pict' || tag === 'w:object') {
        const embedId = findEmbedId(content);
        if (embedId) await addImageFromEmbedId(embedId);
      } else if (tag === 'w:p') {
        await walk(content);
        text += '\n\n';
      } else if (tag === 'w:tab') {
        text += '\t';
      } else if (tag === 'w:br') {
        text += '\n';
      } else if (Array.isArray(content)) {
        await walk(content);
      }
    }
  }

  async function findBodyAndWalk(node) {
    if (Array.isArray(node)) {
      for (const item of node) await findBodyAndWalk(item);
      return;
    }
    if (node && typeof node === 'object') {
      if (node['w:body']) { await walk(node['w:body']); return; }
      for (const key of Object.keys(node)) {
        if (key === ':@') continue;
        await findBodyAndWalk(node[key]);
      }
    }
  }
  await findBodyAndWalk(parsedDoc);

  text = text.replace(/\[\[MATH:([^\]]+)\]\]/g, (m, encoded) => {
    try { return decodeURIComponent(encoded); } catch (e) { return ''; }
  });

  return { text, images };
}

module.exports = { readDocx };
