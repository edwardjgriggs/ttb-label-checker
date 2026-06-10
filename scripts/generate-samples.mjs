import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';

const WARNING_BODY =
  '(1) According to the Surgeon General, women should not drink alcoholic ' +
  'beverages during pregnancy because of the risk of birth defects. ' +
  '(2) Consumption of alcoholic beverages impairs your ability to drive a car ' +
  'or operate machinery, and may cause health problems.';

function wrap(text, max) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max) { lines.push(cur.trim()); cur = w; }
    else cur += ' ' + w;
  }
  lines.push(cur.trim());
  return lines;
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/'/g, '&apos;');
}

function makeLabel({ brand, classType, abv, net, warningHeader, warningBody, headerWeight = 'bold' }) {
  const warnLines = warningBody ? wrap(`${warningHeader} ${warningBody}`.trim(), 70) : [];
  const warnSvg = warnLines
    .map((line, i) => {
      if (i === 0 && warningHeader) {
        const rest = esc(line.slice(warningHeader.length));
        return `<text x="60" y="${620 + i * 26}" font-family="Georgia, 'Times New Roman', serif" font-size="19"><tspan font-weight="${headerWeight}">${esc(warningHeader)}</tspan>${rest}</text>`;
      }
      return `<text x="60" y="${620 + i * 26}" font-family="Georgia, 'Times New Roman', serif" font-size="19">${esc(line)}</text>`;
    })
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="820" viewBox="0 0 900 820">
  <rect width="900" height="820" fill="#f5efdf"/>
  <rect x="30" y="30" width="840" height="760" fill="none" stroke="#5a4632" stroke-width="6"/>
  <text x="450" y="170" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="64" font-weight="bold" fill="#2e2316">${esc(brand)}</text>
  <text x="450" y="260" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="34" fill="#5a4632">${esc(classType)}</text>
  <line x1="200" y1="310" x2="700" y2="310" stroke="#5a4632" stroke-width="2"/>
  <text x="450" y="400" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="36" fill="#2e2316">${esc(abv)}</text>
  <text x="450" y="470" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="32" fill="#2e2316">${esc(net)}</text>
  ${warnSvg}
</svg>`;
}

mkdirSync('samples', { recursive: true });
// public/samples/ makes the files web-accessible via Next.js static serving so
// the "Try it" demo buttons can fetch them from the browser without a separate API route.
mkdirSync('public/samples', { recursive: true });

const base = {
  brand: 'OLD TOM DISTILLERY',
  classType: 'Kentucky Straight Bourbon Whiskey',
  abv: '45% Alc./Vol. (90 Proof)',
  net: '750 mL',
  warningHeader: 'GOVERNMENT WARNING:',
  warningBody: WARNING_BODY,
};

const variants = [
  ['valid.png', base],
  ['titlecase-warning.png', { ...base, warningHeader: 'Government Warning:' }],
  ['missing-warning.png', { ...base, warningHeader: '', warningBody: '' }],
  ['wrong-wording.png', { ...base, warningBody: WARNING_BODY.replace('birth defects', 'health issues') }],
  ['no-abv.png', { ...base, abv: '' }],
  ['riverbend.png', { ...base, brand: 'RIVERBEND RESERVE', classType: 'Straight Rye Whiskey', abv: '40% Alc./Vol. (80 Proof)', net: '375 mL' }],
];

for (const [name, cfg] of variants) {
  const buf = await sharp(Buffer.from(makeLabel(cfg))).png().toBuffer();
  writeFileSync(`samples/${name}`, buf);
  writeFileSync(`public/samples/${name}`, buf);
  console.log(`wrote samples/${name} and public/samples/${name}`);
}

const csvContent = [
  'filename,brand_name,class_type,alcohol_percent,net_contents',
  'valid.png,OLD TOM DISTILLERY,Kentucky Straight Bourbon Whiskey,45,750 mL',
  'riverbend.png,Riverbend Reserve,Straight Rye Whiskey,40,375 mL',
  'titlecase-warning.png,OLD TOM DISTILLERY,Kentucky Straight Bourbon Whiskey,45,750 mL',
  'missing-warning.png,OLD TOM DISTILLERY,Kentucky Straight Bourbon Whiskey,45,750 mL',
  'wrong-wording.png,OLD TOM DISTILLERY,Kentucky Straight Bourbon Whiskey,45,750 mL',
  'no-abv.png,OLD TOM DISTILLERY,Kentucky Straight Bourbon Whiskey,45,750 mL',
].join('\n');

writeFileSync('samples/batch.csv', csvContent);
writeFileSync('public/samples/batch.csv', csvContent);
console.log('wrote samples/batch.csv and public/samples/batch.csv');
