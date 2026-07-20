/*
 * QuestionTypeDetector - tach 1 khoi "Cau N. ... A. ... D. ..." thanh { stem, options }, hoac
 * "a) ... d) ..." thanh dung/sai, hoac coi la tra loi ngan neu khong co nhan phuong an nao.
 *
 * Thuat toan "chuoi nhan tang dan lien tiep dai nhat" - da sua 2 loi thuc te trong qua trinh
 * phat trien: (1) khong duoc nuot dau xuong dong sau 1 nhan gia, (2) A-H va a-h phai case-sensitive
 * rieng biet (khong dung chung 1 regex case-insensitive, tung gay nham trac nghiem thanh dung/sai).
 * Da kiem chung dung tren toan bo 12 cau trac nghiem + 4 cau dung/sai trong file de thi that.
 */
function longestIncreasingLabelRun(text, upperCase) {
  const cls = upperCase ? 'A-H' : 'a-h';
  const re = new RegExp('(?:^|[\\n\\t ]{1,})([' + cls + '])\\s*[.)][ \\t]*', 'g');
  const markers = [];
  let m;
  while ((m = re.exec(text))) markers.push({ label: m[1], start: m.index, contentStart: re.lastIndex });

  let best = [];
  for (let i = 0; i < markers.length; i++) {
    const seq = [markers[i]];
    let expected = markers[i].label.charCodeAt(0) + 1;
    for (let j = i + 1; j < markers.length; j++) {
      const code = markers[j].label.charCodeAt(0);
      if (code === expected) { seq.push(markers[j]); expected++; }
      else if (code > expected) break;
    }
    if (seq.length > best.length) best = seq;
  }
  return best;
}

function splitOptions(body, upperCase) {
  const markers = longestIncreasingLabelRun(body, upperCase);
  if (markers.length < 2) return null;

  const stem = body.slice(0, markers[0].start).trim();
  const items = markers.map((marker, i) => {
    const end = i + 1 < markers.length ? markers[i + 1].start : body.length;
    return { label: marker.label, text: body.slice(marker.contentStart, end).trim() };
  });
  return { stem, items };
}

function splitQuestionBody(body) {
  const singleChoice = splitOptions(body, true);
  if (singleChoice) return { stem: singleChoice.stem, type: 'single_choice', options: singleChoice.items };

  const trueFalse = splitOptions(body, false);
  if (trueFalse) return { stem: trueFalse.stem, type: 'true_false', options: trueFalse.items };

  return { stem: body.trim(), type: 'short_answer', options: [] };
}

module.exports = { splitQuestionBody, splitOptions, longestIncreasingLabelRun };
