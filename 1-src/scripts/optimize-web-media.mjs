import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const deployRoot = resolve(sourceRoot, '../1');
const manifest = JSON.parse(readFileSync(resolve(deployRoot, 'question-bank/manifest.json'), 'utf8'));
const cwebp = process.env.CWEBP_BIN || 'cwebp';

const pngs = new Set();
for (const question of manifest.questions) {
  for (const path of [question.questionImage, question.answerImage]) {
    if (path?.startsWith('/1/question-bank/') && path.endsWith('.png')) {
      pngs.add(resolve(deployRoot, path.replace(/^\/1\//, '')));
    }
  }
}
pngs.add(resolve(sourceRoot, 'assets/wmc-loading-screen.png'));
pngs.add(resolve(sourceRoot, 'assets/wmc-one-percent-logo.png'));

let converted = 0;
let skipped = 0;
let originalBytes = 0;
let optimizedBytes = 0;

for (const input of pngs) {
  if (!existsSync(input)) throw new Error(`Missing source image: ${input}`);
  const output = input.replace(/\.png$/i, '.webp');
  originalBytes += statSync(input).size;
  if (existsSync(output) && statSync(output).mtimeMs >= statSync(input).mtimeMs) {
    skipped += 1;
    optimizedBytes += statSync(output).size;
    continue;
  }
  const result = spawnSync(cwebp, ['-quiet', '-q', '90', '-m', '6', '-sharp_yuv', input, '-o', output], {
    encoding: 'utf8'
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || `cwebp failed for ${input}`);
  }
  converted += 1;
  optimizedBytes += statSync(output).size;
}

console.log(JSON.stringify({
  images: pngs.size,
  converted,
  skipped,
  originalMB: Number((originalBytes / 1048576).toFixed(1)),
  optimizedMB: Number((optimizedBytes / 1048576).toFixed(1)),
  reductionPercent: Math.round((1 - optimizedBytes / originalBytes) * 100)
}, null, 2));
