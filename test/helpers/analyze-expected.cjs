const { nativeImage } = require('electron');
const img = nativeImage.createFromPath('/Users/arshdsj/.gemini/antigravity/brain/02a501a1-7df1-4adf-a59c-b44a3ac26a92/.user_uploaded/media_1794679275704_e0bb668f.png');
const size = img.getSize();
console.log('Size:', size);
const bitmap = img.toBitmap();

const bgR = bitmap[0], bgG = bitmap[1], bgB = bitmap[2];
console.log('BG color:', bgR, bgG, bgB);

const rowHasText = [];
for (let y = 0; y < size.height; y++) {
  let count = 0;
  for (let x = 0; x < size.width; x++) {
    const idx = (y * size.width + x) * 4;
    const r = bitmap[idx], g = bitmap[idx + 1], b = bitmap[idx + 2];
    if (Math.abs(r - bgR) > 30 || Math.abs(g - bgG) > 30 || Math.abs(b - bgB) > 30) {
      count++;
    }
  }
  rowHasText.push(count);
}

let inLine = false;
let lineStart = 0;
const textBands = [];
for (let y = 0; y < size.height; y++) {
  if (rowHasText[y] > 5) {
    if (!inLine) { inLine = true; lineStart = y; }
  } else {
    if (inLine) {
      inLine = false;
      textBands.push({ start: lineStart, end: y - 1, height: y - lineStart, center: (lineStart + y - 1) / 2 });
    }
  }
}
console.log('Text bands count:', textBands.length);
textBands.forEach((b, i) => {
  const dist = i > 0 ? (b.center - textBands[i - 1].center).toFixed(1) : '-';
  console.log('Band', i, 'y=' + b.start + '..' + b.end, 'h=' + b.height, 'gap/dist=' + dist);
});
