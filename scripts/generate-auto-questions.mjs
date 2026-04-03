import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const generalBankPath = path.join(root, 'automation-data', 'auto-general-bank.json');
const statePath = path.join(root, 'automation-data', 'question-generator-state.json');
const outputPath = path.join(root, 'Quiz12-auto-questions.js');
const userImageRoot = path.join(root, 'assets', 'images', 'questions');

const RUN_GENERAL_COUNT = 12;

const generalBank = JSON.parse(fs.readFileSync(generalBankPath, 'utf8'));
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

function rotate(array, offset) {
  if (!array.length) return [];
  const safeOffset = ((offset % array.length) + array.length) % array.length;
  return array.slice(safeOffset).concat(array.slice(0, safeOffset));
}

function listImageAssetNames(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      return listImageAssetNames(fullPath);
    }
    return [path.relative(userImageRoot, fullPath).replace(/\\/g, '/')];
  });
}

function readPreviousAutoQuestions() {
  if (!fs.existsSync(outputPath)) return [];
  const fileContents = fs.readFileSync(outputPath, 'utf8');
  const match = fileContents.match(/window\.QUIZ12_AUTO_QUESTIONS\s*=\s*(.*);\s*$/s);
  if (!match?.[1]) return [];
  try {
    return JSON.parse(match[1]);
  } catch {
    return [];
  }
}

const currentAssetSignature = listImageAssetNames(userImageRoot).sort().join('|');
const previousAutoQuestions = readPreviousAutoQuestions();
const preservedImageQuestions = currentAssetSignature === (state.assetImageSignature || '')
  ? previousAutoQuestions.filter(item => item?.img)
  : [];

const generalSelection = rotate(generalBank, state.generalOffset || 0).slice(0, Math.min(RUN_GENERAL_COUNT, generalBank.length));
const generatedQuestions = [...preservedImageQuestions];

for (const entry of generalSelection) {
  generatedQuestions.push({
    id: entry.id,
    q: entry.q,
    o: entry.o,
    a: entry.a,
    h: entry.h,
    r: entry.r,
    img: ''
  });
}

const fileBody = `window.QUIZ12_AUTO_QUESTIONS = ${JSON.stringify(generatedQuestions, null, 2)};\n`;
fs.writeFileSync(outputPath, fileBody, 'utf8');

state.generalOffset = ((state.generalOffset || 0) + RUN_GENERAL_COUNT) % generalBank.length;
state.assetImageSignature = currentAssetSignature;
state.lastGeneratedAt = new Date().toISOString();
fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n', 'utf8');

console.log(`Generated ${generatedQuestions.length} auto questions.`);
