export type AnswerCheck = { answer: string; sourceCount: number };
export function evaluateAnswer(input: AnswerCheck) {
  const empty = !input.answer.trim();
  const citesSources = /\[Source\s+\d+\]/i.test(input.answer) || /\[\d+\]/.test(input.answer);
  return { nonEmpty: !empty, hasCitations: input.sourceCount === 0 ? null : citesSources, answerCharacters: input.answer.length };
}
