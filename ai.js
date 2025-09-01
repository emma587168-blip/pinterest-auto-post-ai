import fetch from 'node-fetch';

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export async function generateContentForImage({ image_url, filename = '' } = {}) {
  if (!OPENAI_KEY) {
    const base = filename.replace(/[-_]/g, ' ').replace(/\.[^.]+$/, '');
    return {
      title: base ? capitalizeFirst(base) : 'Amazing Pin',
      description: base ? `${capitalizeFirst(base)} — check this out.` : 'Amazing image to try!',
      hashtags: base ? generateHashtagsFromText(base) : ['#inspiration', '#pin']
    };
  }

  const prompt = `
You write Pinterest-ready content for a single image.
Image URL: ${image_url || '(no url provided)'}
If you cannot fetch it, infer from filename: "${filename}".
Return ONLY JSON:
{"title":"<3-6 words>","description":"<<=150 chars>","hashtags":["#tag1","..."]}
`;

  const body = {
    model: OPENAI_MODEL,
    messages: [
      { role: 'system', content: 'You output strict JSON for Pinterest posts.' },
      { role: 'user', content: prompt }
    ],
    max_tokens: 300,
    temperature: 0.8
  };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_KEY}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error('OpenAI error', res.status, txt);
    return {
      title: filename ? capitalizeFirst(filename) : 'Auto Pin',
      description: 'Auto generated description.',
      hashtags: ['#auto', '#pin']
    };
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || '';
  let parsed = null;
  try {
    const cleaned = text.replace(/```json|```/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch (e) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { parsed = JSON.parse(match[0]); } catch {}
    }
  }

  if (!parsed) {
    return {
      title: filename ? capitalizeFirst(filename) : 'Auto Pin',
      description: 'Auto generated description.',
      hashtags: ['#auto', '#pin']
    };
  }

  return {
    title: String(parsed.title || '').slice(0, 100),
    description: String(parsed.description || '').slice(0, 300),
    hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.slice(0, 8) : generateHashtagsFromText(parsed.title || parsed.description || filename)
  };
}

function capitalizeFirst(s) {
  if (!s) return s;
  return s.split(' ').map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : w).join(' ');
}
function generateHashtagsFromText(text) {
  if (!text) return ['#pin'];
  const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
  const uniq = [...new Set(words)].slice(0, 6);
  return uniq.map(w => '#' + w);
}
