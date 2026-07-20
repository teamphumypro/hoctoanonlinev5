/*
 * Trich xuat anh nhung dang JPEG (DCTDecode) truc tiep tu byte tho cua file PDF, khong can
 * thu vien PDF-render nao (pdfjs-dist, poppler, mupdf...) vi moi truong chay khong co mang de
 * cai them goi moi. Chi dung module "zlib" co san trong Node (khong dung den o day nhung de
 * ngo neu sau nay can giai nen FlateDecode cho anh bitmap khong nen JPEG).
 *
 * PHAM VI VA GIOI HAN (ghi ro, khong nhan vo hon thuc te lam duoc):
 *  - Chi trich duoc anh nen kieu JPEG (/Filter /DCTDecode) - day la kieu pho bien nhat khi
 *    Word/LibreOffice/Google Docs xuat PDF co nhung anh/hinh minh hoa. Anh bitmap khong nen
 *    (FlateDecode tho) chua duoc ho tro trong ban nay.
 *  - Chi hoat dong voi PDF "co dien" (object ghi truc tiep trong file). PDF hien dai nen object
 *    trong /ObjStm (PDF 1.5+, pho bien voi file xuat tu Acrobat/InDesign moi) se KHONG tim thay
 *    object bang cach quet nay - ham se tra ve rong (images: [], pageImageMap: {}), KHONG loi,
 *    KHONG lam vo luong doc PDF hien co (van doc duoc chu binh thuong qua pdf-parse).
 *  - Gan anh vao "cuoi noi dung cua dung trang" (xap xi theo trang), KHONG chen dung vi tri
 *    inline giua doan van nhu DOCX, vi de xac dinh vi tri inline chinh xac can phan tich toan bo
 *    content stream (thu tu lenh Tj/TJ/Do) - ngoai pham vi ban vien nay.
 *  - Thu tu trang duoc suy ra tu thu tu xuat hien cua object /Type /Page trong file byte, khong
 *    phai tu cay trang (page tree) that su - voi da so PDF xuat truc tiep (khong bi sap xep lai)
 *    thu tu nay trung voi thu tu doc.
 *
 * Neu gap PDF khong trich duoc anh nao (do roi vao 1 trong cac gioi han tren), he thong van
 * hoat dong binh thuong nhu truoc khi co ban fix nay (chi mat anh, khong mat chu, khong crash).
 */

function findMatchingDictEnd(s, openIdx) {
  // s[openIdx] va s[openIdx+1] phai la "<<". Duyet can bang << / >> de tim vi tri dong dung.
  let depth = 0;
  let i = openIdx;
  while (i < s.length - 1) {
    if (s[i] === '<' && s[i + 1] === '<') { depth++; i += 2; continue; }
    if (s[i] === '>' && s[i + 1] === '>') { depth--; i += 2; if (depth === 0) return i; continue; }
    i++;
  }
  return -1;
}

function parseObjects(s) {
  const objRe = /(\d+)\s+0\s+obj\b/g;
  const headers = [];
  let m;
  while ((m = objRe.exec(s))) headers.push({ num: Number(m[1]), headerEnd: objRe.lastIndex });

  const objects = {};
  for (let idx = 0; idx < headers.length; idx++) {
    const { num, headerEnd } = headers[idx];
    const nextStart = idx + 1 < headers.length ? headers[idx + 1].headerEnd : s.length;
    let endobjIdx = s.indexOf('endobj', headerEnd);
    if (endobjIdx === -1 || endobjIdx > nextStart + 5000) endobjIdx = nextStart; // an toan neu thieu endobj
    objects[num] = { headerEnd, bodyEnd: endobjIdx, raw: s.slice(headerEnd, endobjIdx) };
  }
  return objects;
}

function extractDictAndStream(objRaw) {
  const trimmedStart = objRaw.search(/\S/);
  if (trimmedStart === -1 || objRaw[trimmedStart] !== '<' || objRaw[trimmedStart + 1] !== '<') {
    return { dict: null, streamStart: -1, streamEnd: -1 };
  }
  const dictEnd = findMatchingDictEnd(objRaw, trimmedStart);
  if (dictEnd === -1) return { dict: null, streamStart: -1, streamEnd: -1 };
  const dict = objRaw.slice(trimmedStart, dictEnd);

  const streamKwIdx = objRaw.indexOf('stream', dictEnd);
  if (streamKwIdx === -1) return { dict, streamStart: -1, streamEnd: -1 };
  // Sau tu "stream" la 1 EOL (CRLF hoac LF) truoc khi den du lieu nhi phan that su
  let dataStart = streamKwIdx + 'stream'.length;
  if (objRaw[dataStart] === '\r' && objRaw[dataStart + 1] === '\n') dataStart += 2;
  else if (objRaw[dataStart] === '\n') dataStart += 1;

  const endstreamIdx = objRaw.indexOf('endstream', dataStart);
  if (endstreamIdx === -1) return { dict, streamStart: -1, streamEnd: -1 };

  const lengthMatch = /\/Length\s+(\d+)(?!\s*\d*\s*0\s+R)/.exec(dict);
  let dataEnd = endstreamIdx;
  if (lengthMatch) {
    const declared = dataStart + Number(lengthMatch[1]);
    // Chi tin /Length neu no khong vuot qua vi tri endstream tim thay (tranh Length sai lech do object nen)
    if (declared > dataStart && declared <= endstreamIdx) dataEnd = declared;
  }
  return { dict, streamStart: dataStart, streamEnd: dataEnd };
}

function resolveDictSource(container, refOrInlineMatch, objects) {
  // refOrInlineMatch co the la mot dict "<<...>>" ngay tai cho, hoac 1 tham chieu "N 0 R"
  const refMatch = /^\s*(\d+)\s+0\s+R/.exec(refOrInlineMatch);
  if (refMatch) {
    const target = objects[Number(refMatch[1])];
    if (!target) return null;
    const trimmedStart = target.raw.search(/\S/);
    if (trimmedStart === -1 || target.raw[trimmedStart] !== '<') return null;
    const dictEnd = findMatchingDictEnd(target.raw, trimmedStart);
    return dictEnd === -1 ? null : target.raw.slice(trimmedStart, dictEnd);
  }
  const inlineIdx = refOrInlineMatch.indexOf('<<');
  if (inlineIdx === -1) return null;
  const dictEnd = findMatchingDictEnd(refOrInlineMatch, inlineIdx);
  return dictEnd === -1 ? null : refOrInlineMatch.slice(inlineIdx, dictEnd);
}

function findSubDict(dict, key, objects) {
  // Tim "/Key <<...>>" hoac "/Key N 0 R" ngay sau khoa key trong 1 dict cho truoc
  const re = new RegExp('/' + key + '\\s*(<<|\\d+\\s+0\\s+R)');
  const m = re.exec(dict);
  if (!m) return null;
  const after = dict.slice(m.index + m[0].length - m[1].length);
  return resolveDictSource(dict, after, objects);
}

/**
 * @param {Buffer} buffer noi dung file PDF goc
 * @returns {{ images: string[], pageImageMap: Object<number, number[]> }}
 *   images: mang data URL (data:image/jpeg;base64,...)
 *   pageImageMap: trang (0-based, theo thu tu quet duoc) -> danh sach chi so trong mang images
 */
function extractPdfImages(buffer) {
  try {
    const s = buffer.toString('latin1'); // 1 ky tu = 1 byte, giu nguyen offset de cat buffer goc
    const objects = parseObjects(s);

    const images = [];
    const imageIndexByObjNum = {};

    for (const numStr of Object.keys(objects)) {
      const num = Number(numStr);
      const obj = objects[num];
      const { dict, streamStart, streamEnd } = extractDictAndStream(obj.raw);
      if (!dict || streamStart < 0) continue;
      if (!/\/Subtype\s*\/Image/.test(dict)) continue;
      if (!/\/Filter\s*(\/DCTDecode|\[[^\]]*\/DCTDecode[^\]]*\])/.test(dict)) continue; // chi ho tro JPEG (xem gioi han o dau file)

      // streamStart/streamEnd la offset trong obj.raw (chuoi con); quy doi ve offset thuc trong buffer goc
      // dua tren headerEnd da luu tu buoc parseObjects (khong dung indexOf de tranh sai lech khi noi dung trung lap)
      const absStart = obj.headerEnd + streamStart;
      const absEnd = obj.headerEnd + streamEnd;
      if (absEnd <= absStart || absEnd > buffer.length) continue;

      const jpegBytes = buffer.slice(absStart, absEnd);
      // Kiem tra dau hieu JPEG that su (SOI marker 0xFFD8) truoc khi nhan la anh hop le
      if (jpegBytes.length < 4 || jpegBytes[0] !== 0xff || jpegBytes[1] !== 0xd8) continue;

      const idx = images.length;
      images.push(`data:image/jpeg;base64,${jpegBytes.toString('base64')}`);
      imageIndexByObjNum[num] = idx;
    }

    if (images.length === 0) return { images: [], pageImageMap: {} };

    // Gan anh vao trang: voi moi object /Type /Page, tim /Resources -> /XObject -> cac tham chieu anh
    const pageImageMap = {};
    let pageIdx = 0;
    for (const numStr of Object.keys(objects)) {
      const num = Number(numStr);
      const obj = objects[num];
      const raw = obj.raw;
      const looksLikePage = /\/Type\s*\/Page(?!s)/.test(raw.slice(0, Math.min(raw.length, 2000)));
      if (!looksLikePage) continue;

      const pageDictEnd = raw.search(/\S/) === 0 || raw[raw.search(/\S/)] === '<' ? findMatchingDictEnd(raw, raw.search(/\S/)) : -1;
      const pageDict = pageDictEnd > -1 ? raw.slice(raw.search(/\S/), pageDictEnd) : raw;

      const resourcesDict = findSubDict(pageDict, 'Resources', objects);
      if (resourcesDict) {
        const xobjectDict = findSubDict(resourcesDict, 'XObject', objects);
        if (xobjectDict) {
          const refRe = /\/[\w.]+\s+(\d+)\s+0\s+R/g;
          let rm;
          const found = [];
          while ((rm = refRe.exec(xobjectDict))) {
            const refNum = Number(rm[1]);
            if (imageIndexByObjNum[refNum] !== undefined) found.push(imageIndexByObjNum[refNum]);
          }
          if (found.length) pageImageMap[pageIdx] = found;
        }
      }
      pageIdx++;
    }

    return { images, pageImageMap };
  } catch (err) {
    // Khong lam vo luong doc PDF chinh (van doc duoc chu binh thuong) neu buoc trich anh nay that bai vi ly do gi
    console.error('Khong trich xuat duoc anh nhung trong PDF (bo qua, chi giu van ban):', err.message);
    return { images: [], pageImageMap: {} };
  }
}

module.exports = { extractPdfImages, findMatchingDictEnd, parseObjects };
