// Doc file .docx theo dung thu tu trong tai lieu (van ban + cong thuc Equation + anh nhung)
// de ghep dung vi tri cong thuc/anh vao giua cau chu, thay vi de mammoth bo qua cong thuc.
// Neu buoc nao that bai, nem loi ra ngoai de ham goi dung phuong an du phong (mammoth text thuong).
const fs = require('fs');

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

  // Duyet de tim r:embed (id anh nhung) o bat ky do sau trong 1 nhanh XML
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
          if (key.endsWith(':embed') || key === '@_r:embed') return attrs[key];
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

  // Cong thuc MathType kieu cu (Equation.DSMT4/MathType 6+) khong nam trong w:drawing (DrawingML)
  // ma nam trong w:object > v:shape > v:imagedata r:id="..." (VML) kem theo o:OLEObject rieng.
  // Neu chi tim r:embed (DrawingML) se khong thay gi va cong thuc bi mat trang tuyet doi, khong con
  // ca placeholder canh bao. Ham nay tim rieng thuoc tinh r:id cua the v:imagedata (anh xem truoc
  // cua OLE, thuong la .wmf/.emf) de tai dung anh cong thuc, khong nham voi r:id cua o:OLEObject
  // (tro toi du lieu OLE nhi phan that su, khong hien thi truc tiep duoc).
  function findVmlImageDataId(node) {
    if (Array.isArray(node)) {
      for (const item of node) {
        const found = findVmlImageDataId(item);
        if (found) return found;
      }
      return null;
    }
    if (node && typeof node === 'object') {
      for (const key of Object.keys(node)) {
        if (key === ':@') continue;
        if (key === 'v:imagedata') {
          const attrs = node[':@'];
          if (attrs && attrs['@_r:id']) return attrs['@_r:id'];
        }
        const found = findVmlImageDataId(node[key]);
        if (found) return found;
      }
    }
    return null;
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
      } else if (tag === 'w:drawing') {
        const embedId = findEmbedId(content);
        if (embedId) await addImageFromEmbedId(embedId);
      } else if (tag === 'w:pict' || tag === 'w:object') {
        // w:object: cong thuc MathType/Equation OLE cu. w:pict: anh VML cu.
        // Uu tien r:id cua v:imagedata (anh xem truoc WMF/EMF hien thi duoc); chi khi khong co
        // moi thu r:embed (truong hop hiem gap DrawingML long trong w:pict).
        const embedId = findVmlImageDataId(content) || findEmbedId(content);
        if (embedId) await addImageFromEmbedId(embedId);
        else text += ' [công thức - chưa hiển thị được, vui lòng sửa tay] ';
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

// Chuyen doi hang loat cac anh cong thuc dang WMF/EMF sang PNG trong 1 lan goi LibreOffice duy nhat
// (nhanh hon nhieu so voi mo LibreOffice rieng cho tung anh). Neu server khong co LibreOffice
// (lenh "soffice" khong ton tai), tra ve map rong va KHONG bao loi - de ham goi tu dong dung
// phuong an du phong (hien chu bao thay vi anh).
async function convertAllWmfImages(zip, relMap) {
  const path = require('path');
  const os = require('os');
  const { execFile } = require('child_process');

  const wmfTargets = Object.values(relMap)
    .filter(t => /\.(wmf|emf)$/i.test(t))
    .map(t => t.startsWith('media/') ? 'word/' + t : 'word/media/' + t.split('/').pop());
  const uniqueTargets = [...new Set(wmfTargets)];
  if (uniqueTargets.length === 0) return {};

  let tmpDir;
  try {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wmfconv-'));
    const writtenPaths = [];
    for (const target of uniqueTargets) {
      const f = zip.file(target);
      if (!f) continue;
      const buf = await f.async('nodebuffer');
      const localName = path.basename(target).replace(/[^a-zA-Z0-9_.-]/g, '_');
      const localPath = path.join(tmpDir, localName);
      fs.writeFileSync(localPath, buf);
      writtenPaths.push({ target, localPath, localName });
    }
    if (writtenPaths.length === 0) return {};

    // LibreOffice headless "--convert-to" khi nhan mot lan qua nhieu file (vd > 100 cong thuc)
    // hay bo sot mot so file mot cach im lang (khong bao loi, chi don gian khong sinh PNG output).
    // De khong lam mat cong thuc mot cach vo tinh, chia nho thanh tung lo (batch) va lam lai
    // (retry) rieng cho nhung file van con thieu sau moi lan, toi da 3 vong.
    const runBatch = (paths) => new Promise((resolve) => {
      if (paths.length === 0) return resolve();
      execFile('soffice', ['--headless', '--convert-to', 'png', '--outdir', tmpDir, ...paths],
        { timeout: 180000 }, () => resolve()); // du co loi cung resolve, khong reject
    });

    const pngPathFor = (w) => path.join(tmpDir, w.localName.replace(/\.(wmf|emf)$/i, '.png'));
    const BATCH_SIZE = 40;
    for (let round = 0; round < 3; round++) {
      const missing = writtenPaths.filter(w => !fs.existsSync(pngPathFor(w)));
      if (missing.length === 0) break;
      for (let i = 0; i < missing.length; i += BATCH_SIZE) {
        await runBatch(missing.slice(i, i + BATCH_SIZE).map(w => w.localPath));
      }
    }

    const result = {};
    for (const w of writtenPaths) {
      const pngPath = pngPathFor(w);
      if (fs.existsSync(pngPath)) {
        result[w.target] = fs.readFileSync(pngPath).toString('base64');
      }
    }
    return result;
  } catch (err) {
    console.error('Khong chuyen doi duoc cong thuc WMF (co the server chua cai LibreOffice):', err.message);
    return {};
  } finally {
    if (tmpDir) { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {} }
  }
}

module.exports = { extractDocxRich };
