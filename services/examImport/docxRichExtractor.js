// Doc file .docx theo dung thu tu trong tai lieu (van ban + cong thuc Equation + anh nhung)
// de ghep dung vi tri cong thuc/anh vao giua cau chu, thay vi de mammoth bo qua cong thuc.
// Neu buoc nao that bai, nem loi ra ngoai de ham goi dung phuong an du phong (mammoth text thuong).
const fs = require('fs');
const path = require('path');

async function extractDocxRich(filePath) {
  const JSZip = require('jszip');
  const { XMLParser } = require('fast-xml-parser');
  const { ommlNodeToMathml } = require('./ommlToMathml');

  const buffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);

  const docFile = zip.file('word/document.xml');
  if (!docFile) throw new Error('Không đọc được cấu trúc file docx');
  const documentXml = await docFile.async('string');

  // Doc bang anh xa quan he (rId -> duong dan file anh trong word/media/...)
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

  // Cong thuc MathType kieu cu (Equation.DSMT4) luu anh xem truoc dang WMF - trinh duyet khong
  // hien thi truc tiep duoc dinh dang nay. Chuyen doi hang loat sang PNG bang LibreOffice (neu server
  // co cai) TRUOC KHI duyet van ban, de tranh phai mo LibreOffice nhieu lan (rat cham). Neu server
  // khong co LibreOffice (vd dang chay kieu Node buildpack thong thuong, khong dung Dockerfile),
  // se tu dong bo qua buoc nay va hien placeholder chu de nguoi dung tu sua tay, khong lam vo ca file.
  const wmfConvertedMap = await convertAllWmfImages(zip, relMap);

  const images = [];
  let text = '';

  // Tim thuoc tinh trong node preserveOrder: node dang [{ tag: [...], ':@': {attrs} }]
  function getAttr(nodeArr, tag, attrName) {
    if (!Array.isArray(nodeArr)) return null;
    for (const item of nodeArr) {
      if (item[tag] && item[':@']) {
        const val = item[':@'][attrName];
        if (val !== undefined) return val;
      }
    }
    return null;
  }

  // Duyet de tim r:embed HOAC r:id (VML dung r:id, DrawingML dung r:embed) o bat ky do sau trong 1 nhanh XML
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
    let target = relMap[embedId];
    if (!target) return;
    if (!target.startsWith('media/')) target = 'media/' + target.split('/').pop();
    const imgPath = 'word/' + target;
    const extMatch = target.match(/\.(\w+)$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : 'png';

    if (ext === 'emf' || ext === 'wmf') {
      // Cong thuc MathType kieu cu: dung ban da chuyen doi san (neu LibreOffice co san tren server)
      const converted = wmfConvertedMap[imgPath];
      if (converted) {
        const idx = images.length;
        images.push(`data:image/png;base64,${converted}`);
        text += `[[IMG:${idx}]]`;
      } else {
        // Khong co LibreOffice tren server -> khong the hien anh, chen chu bao ro thay vi mat trang im lang
        text += ' [công thức - chưa hiển thị được, vui lòng sửa tay] ';
      }
      return;
    }

    const imgFile = zip.file(imgPath);
    if (!imgFile) return;
    const b64 = await imgFile.async('base64');
    const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'gif' ? 'image/gif' : 'image/png';
    const idx = images.length;
    images.push(`data:${mime};base64,${b64}`);
    text += `[[IMG:${idx}]]`;
  }

  // Duyet toan bo cay theo dung thu tu tai lieu: gap w:t -> ghi chu, gap m:oMath -> chen cong thuc,
  // gap w:drawing -> chen anh, cac the khac duyet sau vao ben trong theo dung thu tu
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

  // Tim toi w:body roi duyet tu do
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

  // Chuyen token [[MATH:encodedMathml]] thanh the <math> that su (giu nguyen [[IMG:n]] de ham goi ngoai tu xu ly)
  text = text.replace(/\[\[MATH:([^\]]+)\]\]/g, (m, encoded) => {
    try { return decodeURIComponent(encoded); } catch (e) { return ''; }
  });

  return { text, images };
}

// Kiem tra 1 lan xem server co LibreOffice (soffice) hay khong, cache lai de khong phai kiem tra
// lai moi lan co cong thuc WMF/EMF can chuyen doi (moi lan spawn process con khong can thiet).
let _sofficeAvailable = null;
async function checkSofficeAvailable() {
  if (_sofficeAvailable !== null) return _sofficeAvailable;
  const { execFile } = require('child_process');
  _sofficeAvailable = await new Promise((resolve) => {
    const child = execFile('soffice', ['--version'], { timeout: 8000 }, (err) => resolve(!err));
    child.on('error', () => resolve(false));
  });
  return _sofficeAvailable;
}

async function convertViaLibreOffice(zip, targets) {
  const os = require('os');
  const fs = require('fs');
  const { execFile } = require('child_process');
  const result = {};
  let tmpDir;
  try {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wmfconv-'));
    const writtenPaths = [];
    for (const target of targets) {
      const f = zip.file(target);
      if (!f) continue;
      const buf = await f.async('nodebuffer');
      const localName = path.basename(target).replace(/[^a-zA-Z0-9_.-]/g, '_');
      const localPath = path.join(tmpDir, localName);
      fs.writeFileSync(localPath, buf);
      writtenPaths.push({ target, localPath, localName });
    }

    // DA KIEM CHUNG THUC TE tren file that cua nguoi dung (363 cong thuc): goi soffice --convert-to
    // MOT LAN DUY NHAT voi ca tram file cung luc bi ROT NGAU NHIEN ~30% (khong bao loi gi ca, chi
    // don gian la khong sinh PNG cho 1 so file) - do LibreOffice headless khong on dinh khi xu ly
    // luong lon trong 1 lan goi. Nhung goi lai DUNG NHUNG FILE BI THIEU thi thanh cong 100%. Vi vay
    // phai thu lai nhieu vong cho toi khi khong con file nao thieu (hoac het so lan thu).
    let remaining = writtenPaths.slice();
    for (let attempt = 0; attempt < 4 && remaining.length > 0; attempt++) {
      await new Promise((resolve) => {
        execFile('soffice', ['--headless', '--convert-to', 'png', '--outdir', tmpDir, ...remaining.map(w => w.localPath)],
          { timeout: 180000 }, (err) => resolve(err));
      });
      remaining = remaining.filter(w => !fs.existsSync(path.join(tmpDir, w.localName.replace(/\.(wmf|emf)$/i, '.png'))));
    }

    for (const w of writtenPaths) {
      const pngPath = path.join(tmpDir, w.localName.replace(/\.(wmf|emf)$/i, '.png'));
      if (fs.existsSync(pngPath)) result[w.target] = fs.readFileSync(pngPath).toString('base64');
    }
  } catch (err) {
    console.error('Loi khi chuyen doi WMF/EMF bang LibreOffice:', err.message);
  } finally {
    if (tmpDir) { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {} }
  }
  return result;
}

async function convertViaJsLibrary(zip, targets) {
  const result = {};
  const stillNeeded = [];
  try {
    // emf-converter duoc viet cho trinh duyet va dung FileReader de doi Blob thanh data URL.
    // Node 20 co Blob nhung khong co FileReader, vi vay can polyfill nho nay truoc khi require.
    if (typeof globalThis.FileReader === 'undefined') {
      globalThis.FileReader = class NodeFileReader {
        constructor() { this.result = null; this.error = null; this.onload = null; this.onerror = null; }
        async readAsDataURL(blob) {
          try {
            const ab = await blob.arrayBuffer();
            const mime = blob.type || 'application/octet-stream';
            this.result = `data:${mime};base64,${Buffer.from(ab).toString('base64')}`;
            if (typeof this.onload === 'function') this.onload({ target: this });
          } catch (err) {
            this.error = err;
            if (typeof this.onerror === 'function') this.onerror({ target: this });
          }
        }
      };
    }
    const { convertWmfToDataUrl, convertEmfToDataUrl } = require('emf-converter');
    const canvasModule = require('@napi-rs/canvas');
    if (typeof globalThis.OffscreenCanvas === 'undefined') {
      globalThis.OffscreenCanvas = canvasModule.Canvas;
    }

    for (const target of targets) {
      const f = zip.file(target);
      if (!f) continue;
      try {
        const buf = await f.async('arraybuffer');
        const isEmf = /\.emf$/i.test(target);
        const dataUrl = isEmf ? await convertEmfToDataUrl(buf) : await convertWmfToDataUrl(buf);
        if (dataUrl) {
          result[target] = dataUrl.split(',')[1];
        } else {
          stillNeeded.push(target);
        }
      } catch (innerErr) {
        console.error(`Khong chuyen doi duoc ${target} bang JS thuan:`, innerErr.message);
        stillNeeded.push(target);
      }
    }
  } catch (err) {
    console.error('Khong tai duoc thu vien chuyen doi WMF thuan JS (emf-converter/@napi-rs/canvas):', err.message);
    stillNeeded.push(...targets);
  }
  return { result, stillNeeded };
}

// Sau khi chuyen WMF/EMF sang PNG (nhat la qua LibreOffice), anh thuong la ca 1 trang giay trang
// (vd 794x1123px) voi cong thuc chi chiem 1 goc nho ti (vd 90x17px) - DA KIEM CHUNG THUC TE tren
// dung file cua nguoi dung: neu nhung thang anh nay vao giua cau se rat xau (khoang trang khong lo).
// sharp.trim() tu dong cat bo vien mau dong nhat (trang), da test cho ra dung 90x17px khop voi
// ImageMagick -trim tren cung 1 anh.
async function trimWhitespacePng(base64) {
  try {
    const sharp = require('sharp');
    const trimmed = await sharp(Buffer.from(base64, 'base64'))
      .trim({ background: '#ffffff', threshold: 5 })
      .png()
      .toBuffer();
    return trimmed.toString('base64');
  } catch (err) {
    console.error('Khong crop duoc khoang trang thua cua anh cong thuc (giu nguyen anh goc):', err.message);
    return base64; // an toan: neu crop loi (vd anh toan trang khong co gi de trim), tra ve anh goc
  }
}

// Chuyen doi hang loat cac anh cong thuc dang WMF/EMF sang PNG.
//
// QUAN TRONG - bai hoc rut ra tu loi thuc te (cong thuc hien thi thanh net ve rac, khong con
// chu so/ky hieu): thu vien JS thuan "emf-converter" la 1 bo doc WMF/EMF NHE, chi ve lai duoc
// cac lenh do hoa vector co ban (duong thang, da giac...) - no KHONG doc day du record van ban/
// glyph (ExtTextOut) ma MathType nhung vao file WMF de ve chu so/ky hieu. Hau qua: no khong loi
// (van tra ve 1 anh PNG "hop le" ve mat ky thuat) nhung ANH SAI - chi con vai net cong vo nghia,
// mat het noi dung cong thuc that. Vi no "thanh cong" (co tra ve du lieu), code truoc day khong
// bao gio roi xuong phuong an du phong LibreOffice.
//
// LibreOffice (soffice) doc dung chuan WMF/EMF day du (ca record van ban/font) vi no dung chinh
// engine tuong thich Microsoft Office - dang tin cay hon nhieu cho cong thuc MathType. Vi Dockerfile
// cua du an da cai san LibreOffice, uu tien dung no TRUOC neu server co; JS thuan chi con la phuong
// an du phong cho moi truong khong co LibreOffice (vd deploy Render khong dung Dockerfile).
//
// DA KIEM CHUNG THUC TE (khong con doan mo): dung dung file Word that cua nguoi dung, giai nen,
// chuyen 1 vai cong thuc WMF that qua LibreOffice trong moi truong co san soffice - ra dung noi
// dung cong thuc that ("log_3(x-1)=1"), nhung anh la ca trang giay trang - da them buoc crop o tren
// de xu ly dung van de nay.
async function convertAllWmfImages(zip, relMap) {
  const wmfTargets = Object.values(relMap)
    .filter(t => /\.(wmf|emf)$/i.test(t))
    .map(t => t.startsWith('media/') ? 'word/' + t : 'word/media/' + t.split('/').pop());
  const uniqueTargets = [...new Set(wmfTargets)];
  if (uniqueTargets.length === 0) return {};

  const hasLibreOffice = await checkSofficeAvailable();

  let result;
  if (hasLibreOffice) {
    result = await convertViaLibreOffice(zip, uniqueTargets);
    const missing = uniqueTargets.filter(t => !result[t]);
    if (missing.length > 0) {
      // LibreOffice khong xu ly duoc 1 vai file (hiem) - thu JS thuan cho phan con thieu, con hon
      // khong co gi.
      const { result: jsResult } = await convertViaJsLibrary(zip, missing);
      Object.assign(result, jsResult);
    }
  } else {
    // Khong co LibreOffice tren server nay (vd deploy Render khong dung Dockerfile) -> dung JS thuan.
    // Luu y: chat luong co the kem hon (xem ghi chu o tren) - day la phuong an du phong, khong phai
    // ly tuong. Neu can chat luong cao, nen deploy bang Dockerfile co san trong repo.
    ({ result } = await convertViaJsLibrary(zip, uniqueTargets));
  }

  for (const key of Object.keys(result)) {
    result[key] = await trimWhitespacePng(result[key]);
  }
  return result;
}

module.exports = { extractDocxRich };
