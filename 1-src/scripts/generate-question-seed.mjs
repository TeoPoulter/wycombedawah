import { readFile, writeFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile(new URL('../../1/question-bank/manifest.json', import.meta.url), 'utf8'));
const questions = manifest.questions.filter((question) => question.enabled && question.metadataStatus === 'reviewed');
if (questions.length !== manifest.questionCount) throw new Error('Question metadata is not fully reviewed.');

const payload = questions.map((question) => ({
  percentage: question.percentage,
  question_image_path: question.questionImage,
  answer_text: question.answerText,
  answer_image_path: question.answerImage,
  answer_kind: question.answerKind,
  choices: question.choices,
  accepted_answers: question.acceptedAnswers
}));

const sql = `-- Generated from public/question-bank/manifest.json. Safe to run repeatedly.
update public.questions set enabled = false where question_image_path is null;

with bank as (
  select * from jsonb_to_recordset($question_bank$${JSON.stringify(payload)}$question_bank$::jsonb) as item(
    percentage smallint,
    question_image_path text,
    answer_text text,
    answer_image_path text,
    answer_kind public.answer_kind,
    choices jsonb,
    accepted_answers jsonb
  )
)
insert into public.questions (
  percentage, question_text, question_image_path, answer_text, answer_image_path,
  answer_kind, choices, accepted_answers, enabled
)
select
  item.percentage, null, item.question_image_path, item.answer_text, item.answer_image_path,
  item.answer_kind, item.choices,
  array(select jsonb_array_elements_text(item.accepted_answers)), true
from bank item
where not exists (
  select 1 from public.questions existing
  where existing.question_image_path = item.question_image_path
);

update public.questions existing
set percentage = item.percentage,
    answer_text = item.answer_text,
    answer_image_path = item.answer_image_path,
    answer_kind = item.answer_kind,
    choices = item.choices,
    accepted_answers = array(select jsonb_array_elements_text(item.accepted_answers)),
    enabled = true
from jsonb_to_recordset($question_bank$${JSON.stringify(payload)}$question_bank$::jsonb) as item(
  percentage smallint,
  question_image_path text,
  answer_text text,
  answer_image_path text,
  answer_kind public.answer_kind,
  choices jsonb,
  accepted_answers jsonb
)
where existing.question_image_path = item.question_image_path;
`;

await writeFile(new URL('../supabase/migrations/20260830_seed_question_bank.sql', import.meta.url), sql);
console.log(`Generated seed for ${questions.length} reviewed questions.`);
