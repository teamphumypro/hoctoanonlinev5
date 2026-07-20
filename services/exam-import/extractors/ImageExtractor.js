/*
 * ImageExtractor - lay du lieu anh nhung thuong (khong phai cong thuc WMF/EMF) tu file docx theo
 * embedId, tra ve dang data-URL de nhung thang vao noi dung.
 */
async function extractImageByEmbedId(zip, relMap, embedId) {
  let target = relMap[embedId];
  if (!target) return null;
  if (!target.startsWith('media/')) target = 'media/' + target.split('/').pop();
  const imgPath = 'word/' + target;
  const extMatch = target.match(/\.(\w+)$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : 'png';

  if (ext === 'wmf' || ext === 'emf') return { isFormula: true, imgPath, ext };

  const imgFile = zip.file(imgPath);
  if (!imgFile) return null;
  const b64 = await imgFile.async('base64');
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'gif' ? 'image/gif' : 'image/png';
  return { isFormula: false, dataUrl: `data:${mime};base64,${b64}` };
}

module.exports = { extractImageByEmbedId };
