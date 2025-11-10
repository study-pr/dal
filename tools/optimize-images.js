// 간단한 이미지 최적화 스크립트(Sharp 필요)
// 사용법: node tools/optimize-images.js input-folder output-folder

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function optimizeDir(input, output) {
  if (!fs.existsSync(output)) fs.mkdirSync(output, { recursive: true });
  const files = fs.readdirSync(input).filter(f => /\.(jpe?g|png)$/i.test(f));
  for (const file of files) {
    const inPath = path.join(input, file);
    const ext = path.extname(file).toLowerCase();
    const outPathSame = path.join(output, file); // 원본 확장자 유지
    const outPathWebp = path.join(output, file.replace(/\.[^.]+$/, '.webp'));

    const img = sharp(inPath).resize({ width: 1200 });
    if (ext === '.png') {
      await img.png({ compressionLevel: 9, palette: true }).toFile(outPathSame);
    } else {
      await img.jpeg({ quality: 80, mozjpeg: true }).toFile(outPathSame);
    }
    await sharp(inPath).resize({ width: 800 }).webp({ quality: 75 }).toFile(outPathWebp);
    console.log('optimized', file);
  }
}

const [,, input, output] = process.argv;
if (!input || !output) {
  console.error('Usage: node tools/optimize-images.js <input-dir> <output-dir>');
  process.exit(1);
}

optimizeDir(input, output).catch(err => { console.error(err); process.exit(1); });
