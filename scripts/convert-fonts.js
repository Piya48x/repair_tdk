
import fs from 'fs';
import path from 'path';

const fontsDir = './fonts';
const outputDir = './src/assets/fonts';
const outputFile = path.join(outputDir, 'SarabunFonts.js');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const fontFiles = [
    { name: 'SarabunRegular', file: 'THSarabunNew.ttf' },
    { name: 'SarabunBold', file: 'THSarabunNew Bold.ttf' }
];

let jsContent = '// This file is auto-generated. Do not edit manually.\n\n';

fontFiles.forEach(font => {
    const filePath = path.join(fontsDir, font.file);
    if (fs.existsSync(filePath)) {
        const base64 = fs.readFileSync(filePath).toString('base64');
        jsContent += `export const ${font.name} = '${base64}';\n\n`;
        console.log(`Converted ${font.file} to base64.`);
    } else {
        console.warn(`File not found: ${filePath}`);
    }
});

fs.writeFileSync(outputFile, jsContent);
console.log(`Saved fonts to ${outputFile}`);
