import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function detectLanguage(text: string): Promise<string> {
  const prompt = `Detect the ISO 639-1 language code of the following text. Reply with code only.\nText: ${text}`;
  const res = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    messages: [{ role: 'user', content: prompt }],
  });
  return (res.choices[0].message.content || 'en').trim().slice(0, 5);
}

export async function translate(text: string, targetLang: string): Promise<string> {
  if (!text) return '';
  const res = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    messages: [
      { role: 'system', content: 'You are a translator. Translate preserving meaning and tone.' },
      { role: 'user', content: `Translate to ${targetLang}:
${text}` },
    ],
  });
  return res.choices[0].message.content || text;
}



