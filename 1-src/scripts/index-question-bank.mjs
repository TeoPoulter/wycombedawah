import { copyFile, mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';

const source = process.argv[2];
if (!source) throw new Error('Pass the WMC 1% Club source folder as the first argument.');

const levels = [90, 80, 70, 60, 50, 45, 40, 35, 30, 25, 20, 15, 10, 5, 1];
const metadata = {
  '90-1':['choice','B'], '90-2':['choice','B'], '90-3':['choice','A'],
  '80-1':['text','TEN'], '80-2':['text','693'], '80-3':['text','DAY'], '80-4':['choice','B'],
  '70-1':['text','Message in a bottle'], '70-2':['text','Ravers'], '70-3':['text','Divide and conquer'],
  '60-1':['text','4'], '60-2':['choice','A'], '60-3':['choice','C'], '60-4':['text','Alphabet'],
  '50-1':['choice','A'], '50-2':['choice','A'], '50-3':['choice','A'], '50-4':['choice','A'],
  '45-1':['choice','D'], '45-2':['choice','C'], '45-3':['choice','C'], '45-4':['choice','B'],
  '40-1':['text','MARCH'], '40-2':['choice','C'], '40-3':['text','5'],
  '35-1':['choice','C'], '35-2':['choice','A'], '35-3':['text','bread'], '35-4':['text','15'],
  '30-1':['text','Polish Reading'], '30-2':['text','Twice'], '30-3':['text','24'], '30-4':['text','5'],
  '25-1':['text','12:50'], '25-2':['choice','A'], '25-3':['text','25%'], '25-4':['text','of'],
  '20-1':['choice','C'], '20-2':['text','3'], '20-3':['text','Eleven + two'], '20-4':['text','Honey'],
  '15-1':['text','5:37'], '15-2':['text','3'], '15-3':['choice','A'], '15-4':['choice','E'],
  '10-1':['text','Fire Engine'], '10-2':['text','5pm'], '10-3':['text','MTW'], '10-4':['text','ORANGE'],
  '5-1':['text','NEWS'], '5-2':['text','7'], '5-3':['text','ORANGE'], '5-4':['text','WHY'],
  '1-1':['text','BE'], '1-2':['text','POSSESSION'], '1-3':['text','5'], '1-4':['text','Y']
};
const destination = new URL('../../1/question-bank/', import.meta.url);
const records = [];
const warnings = [];

await mkdir(destination, { recursive: true });

for (const level of levels) {
  const directoryName = (await readdir(source, { withFileTypes: true }))
    .find((entry) => entry.isDirectory() && entry.name.trim() === `${level}%`)?.name;
  if (!directoryName) {
    warnings.push(`Missing ${level}% folder`);
    continue;
  }

  const folder = join(source, directoryName);
  const files = (await readdir(folder)).filter((name) => extname(name).toLowerCase() === '.png');
  const questions = files
    .map((name) => ({ name, match: name.match(/^Q(\d+)\s+\d+\.png$/i) }))
    .filter((file) => file.match)
    .sort((a, b) => Number(a.match[1]) - Number(b.match[1]));

  const unpairedAnswer = files
    .map((name) => ({ name, match: name.match(/^A(\d+)\s+\d+\.png$/i) }))
    .find((file) => file.match && !questions.some((question) => Number(question.match[1]) === Number(file.match[1])));
  const downloadedQuestion = files.find((name) => name.toLowerCase() === 'download.png');
  if (unpairedAnswer && downloadedQuestion) {
    questions.push({ name: downloadedQuestion, match: unpairedAnswer.match });
    questions.sort((a, b) => Number(a.match[1]) - Number(b.match[1]));
  }

  for (const question of questions) {
    const number = Number(question.match[1]);
    const answer = files.find((name) => new RegExp(`^A${number}\\s+${level}\\.png$`, 'i').test(name));
    const slug = `${level}-${number}`;
    const questionName = `${slug}-question.png`;
    const answerName = `${slug}-answer.png`;
    await copyFile(join(folder, question.name), new URL(questionName, destination));
    if (answer) await copyFile(join(folder, answer), new URL(answerName, destination));
    else warnings.push(`Missing answer for ${level}% question ${number}`);

    const [answerKind, answerText] = metadata[slug] || [];
    const choiceCount = answerKind === 'choice' && answerText === 'E' ? 5 : 4;
    records.push({
      id: slug,
      percentage: level,
      number,
      questionImage: `/1/question-bank/${questionName}`,
      answerImage: answer ? `/1/question-bank/${answerName}` : null,
      answerKind: answerKind || null,
      answerText: answerText || null,
      choices: answerKind === 'choice' ? Array.from({ length: choiceCount }, (_, index) => String.fromCharCode(65 + index)) : [],
      acceptedAnswers: answerText ? [answerText] : [],
      metadataStatus: answerText ? 'reviewed' : 'needs-review',
      enabled: Boolean(answerText)
    });
  }
}

const manifest = {
  generatedAt: new Date().toISOString(),
  sourceFolder: basename(source),
  levels,
  questionCount: records.length,
  completePairCount: records.filter((record) => record.answerImage).length,
  warnings,
  questions: records
};

await writeFile(new URL('manifest.json', destination), `${JSON.stringify(manifest, null, 2)}\n`);
const totalBytes = (await Promise.all(records.flatMap((record) => [record.questionImage, record.answerImage].filter(Boolean)).map(async (path) => {
  const name = path.split('/').pop();
  return (await stat(new URL(name, destination))).size;
}))).reduce((sum, size) => sum + size, 0);

console.log(JSON.stringify({ questions: records.length, completePairs: manifest.completePairCount, warnings, copiedMB: Math.round(totalBytes / 1048576) }, null, 2));
