/*
 * HtmlRenderer - thay token [[IMG:n]] bang the <img> that su (tra cuu trong mang assets).
 */
function restoreImages(str, images) {
  return String(str || '').replace(/\[\[IMG:(\d+)\]\]/g, (m, i) => {
    const src = images[Number(i)];
    return src ? `<img src="${src}" style="vertical-align:middle;">` : '[thiếu ảnh]';
  });
}

module.exports = { restoreImages };
