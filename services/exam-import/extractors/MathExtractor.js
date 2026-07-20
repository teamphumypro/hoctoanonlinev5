/*
 * MathExtractor - chuyen cong thuc dang WMF/EMF (Equation Editor/MathType cu, khong phai OMML)
 * sang PNG, giu dung noi dung + crop gon gang. Module nay hoan toan doc lap, khong dung chung
 * voi services/examImport/docxRichExtractor.js (van con dung rieng cho tinh nang "Doc sach online"
 * - khong dung chung de tranh anh huong tinh nang khac khi sua module nhap de nay).
 *
 * DA KIEM CHUNG THUC TE tren file de thi that cua nguoi dung (363 cong thuc):
 *  - LibreOffice doc dung noi dung cong thuc (vd "log_3(x-1)=1"), thu vien JS thuan (emf-converter)
 *    thi khong doc duoc record chu/glyph, ra net ve rac - nen UU TIEN LibreOffice, JS thuan chi la
 *    du phong khi server khong co LibreOffice.
 *  - Goi soffice --convert-to voi hang tram file CUNG LUC bi rot ngau nhien ~30% (khong bao loi) -
 *    da them co che TU DONG THU LAI cac file con thieu, kiem chung hoi phuc 100% sau 1-2 lan thu lai.
 *  - Anh xuat ra tu LibreOffice la ca trang giay trang, cong thuc chi chiem 1 goc nho - da them
 *    buoc crop bang sharp.trim(), kiem chung dung tung pixel voi ImageMagick -trim tren cung anh.
 */
const path = require('path');

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
        if (dataUrl) result[target] = dataUrl.split(',')[1];
        else stillNeeded.push(target);
      } catch (innerErr) {
        console.error(`Khong chuyen doi duoc ${target} bang JS thuan:`, innerErr.message);
        stillNeeded.push(target);
      }
    }
  } catch (err) {
    console.error('Khong tai duoc thu vien chuyen doi WMF thuan JS:', err.message);
    stillNeeded.push(...targets);
  }
  return { result, stillNeeded };
}

async function trimWhitespacePng(base64) {
  try {
    const sharp = require('sharp');
    const trimmed = await sharp(Buffer.from(base64, 'base64'))
      .trim({ background: '#ffffff', threshold: 5 })
      .png()
      .toBuffer();
    return trimmed.toString('base64');
  } catch (err) {
    console.error('Khong crop duoc khoang trang thua cua anh cong thuc:', err.message);
    return base64;
  }
}

async function convertFormulaImages(zip, relMap) {
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
      const { result: jsResult } = await convertViaJsLibrary(zip, missing);
      Object.assign(result, jsResult);
    }
  } else {
    ({ result } = await convertViaJsLibrary(zip, uniqueTargets));
  }

  for (const key of Object.keys(result)) {
    result[key] = await trimWhitespacePng(result[key]);
  }
  return result;
}

module.exports = { convertFormulaImages, checkSofficeAvailable };
