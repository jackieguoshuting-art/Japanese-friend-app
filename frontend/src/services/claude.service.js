import { buildPrompt } from '../features/chat.js';

const EMOTION_INSTRUCTION = '\n\nJSONの"emotion"フィールドに必ず以下のどれか一つを入れること："idle"|"happy"|"smile"|"surprised"|"lean-smile"|"shy"。選択基準：happy=開心/興奮/良いニュース、smile=温柔/軽い正向/普通の会話、surprised=驚き/予想外、lean-smile=特に親しみ/おちゃめ/俏皮、shy=ユーザーに外見を褒められた/好きと言われた/親密な言葉をかけられた、idle=普通/落ち着き/デフォルト。';

function buildTeacherPrompt({ history = [], userText }) {
  const recent = history.slice(-10).map((item) => `${item.role}: ${item.text}`).join('\n');
  return `你正在和一位中文母语的日语学习者进行一对一辅导。她大约学到 JLPT N4 一半，N5 基础较熟；约半年没复习，需要温和地唤回记忆。她希望以新东方 N4 同步辅导材料为主线；不要假装看过她尚未提供的词表或教材页。\n\n教学方式：用简体中文讲解，用简短自然的日语给例句或练习。每次只出一道题，先等学生作答，不提前泄露答案。答对时简短肯定并说明关键点，然后继续一道题；答错或不完整时先给正确答案、讲清原因，再给一道小练习。结合当前回答调整难度，优先复习 N4 词汇和最近学过的语法。不要扮演朋友，不要聊无关话题。\n\n输出字段：replyJa 放简短日语例句或题干；replyEn 放面向学生的简体中文教学内容；memoryCandidate 留空。第一轮（userText 为 [START]）直接开始一道常见 N4 词汇题，给出日语词语并让她用中文说意思，不能给答案。\n\n最近对话：\n${recent || '（刚开始）'}\n\n学生这次说：\n${userText}\n\n严格返回 JSON，不要附加其他文字。`;
}

export async function getClaudeReply({ apiUrl = '/api/chat', character, topic, memory, history, userText, mode = 'friend' }) {
  const isTeacher = mode === 'teacher';
  const prompt = isTeacher
    ? buildTeacherPrompt({ history, userText })
    : buildPrompt({ character, topic, memory, history, userText });
  const systemPrompt = isTeacher
    ? '你是一位耐心、清晰的日语教师。遵守用户消息里的老师模式规则。'
    : (character.systemPrompt || '') + EMOTION_INSTRUCTION;
  const body = JSON.stringify({ prompt, systemPrompt, mode, characterId: character.id, topicId: topic?.id });

  const MAX_RETRIES = 2;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if (response.ok) return response.json();
    if (response.status === 529 && attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, 2000));
      continue;
    }
    throw new Error(`Claude API request failed: ${response.status}`);
  }
}
