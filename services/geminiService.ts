import { Movie, GeminiMovieResponse } from "../types";

const PROXY_URL = import.meta.env.VITE_API_PROXY || '/api/gemini';

async function fetchFromProxy(payload: any) {
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Request to Gemini Proxy failed.');
  }

  const data = await res.json();
  return data.text;
}

export const fetchMovieMetadata = async (title: string): Promise<GeminiMovieResponse> => {
  const contents = `Provide metadata for the media title "${title}". Identify if it is a "movie" or "tv" series. Return JSON. ensure the summary, genre, country and director are in Chinese (Simplified). If it is a TV series, estimate the total number of episodes and the average runtime per episode (in minutes). If it is a movie, provide the runtime (in minutes).`;

  // We specify these because we want JSON parsing
  const responseText = await fetchFromProxy({
    model: "gemini-2.5-flash",
    contents
  });

  try {
    // Note: Since we use proxy, we might need to be careful with JSON formatting
    // If we want guaranteed JSON, we'd use responseSchema in the proxy, 
    // but for simplicity in this migration we'll try to find the JSON block.
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const cleanedJson = jsonMatch ? jsonMatch[0] : responseText;
    return JSON.parse(cleanedJson) as GeminiMovieResponse;
  } catch (e) {
    console.error("JSON Parse Error on proxy response:", e, responseText);
    throw new Error("AI 返回了无法解析的格式。");
  }
};

export const generateAiReview = async (title: string, rating: number, mediaType: string = 'movie'): Promise<string> => {
  const typeText = mediaType === 'tv' ? "TV series" : "movie";
  const contents = `Write a short, casual, 2-sentence review for the ${typeText} "${title}" in Chinese (Simplified) giving it a rating of ${rating}/5 stars. Focus on the vibe.`;

  return await fetchFromProxy({
    model: "gemini-2.5-flash",
    contents
  });
}

export const translateToChinese = async (text: string, context: 'name' | 'genre' | 'country' = 'name'): Promise<string> => {
  if (!text) return text;

  let prompt = `你是一个专业的影视翻译专家。请将以下${context === 'genre' ? '类型标签' : '影视专有名词（导演、主演或国家）'}翻译为地道的简体中文。`;

  if (context === 'genre') {
    prompt += `
    - "Sci-Fi & Fantasy" 必须翻译为 "科幻, 奇幻"
    - "Sci-Fi" 必须翻译为 "科幻"
    - "Fantasy" 必须翻译为 "奇幻"
    - "Action & Adventure" 翻译为 "动作, 冒险"
    - 多个标签请用中文逗号 "，" 分隔。`;
  } else {
    prompt += `
    - 即使是人名也请直接音译或查证后提供中文名。
    - 绝对不要返回任何英文描述或解释。`;
  }

  prompt += `\n\n待翻译文本: "${text}"\n只返回翻译后的纯文本。`;

  try {
    return await fetchFromProxy({
      model: "gemini-2.5-flash",
      contents: prompt
    });
  } catch (error) {
    console.error("Translation Error:", error);
    return text;
  }
}

export const generateButlerResponse = async (
  movies: Movie[],
  command: 'insights' | 'recommendations',
  userInput?: string
): Promise<string> => {
  // Simplify movie data
  const librarySnapshot = movies.map(m => ({
    t: m.title,
    g: m.genre,
    r: m.rating,
    s: m.status,
    p: m.platform,
    mt: m.mediaType,
    d: m.director
  })).slice(-50);

  let prompt = "";
  if (command === 'insights') {
    prompt = `As a professional film critic and data analyst, analyze my movie library: ${JSON.stringify(librarySnapshot)}. 
    Provide a deep insight into my viewing patterns, favorite genres, director bias, and platform habits. 
    Use a professional yet witty tone in Chinese (Simplified). Limit to 3 short paragraphs. Include a catchy title.`;
  } else {
    prompt = `Based on my library preferences: ${JSON.stringify(librarySnapshot)}, recommend 3 movies or TV shows I haven't watched yet. 
    Explain why based on my previous high ratings. Use Chinese (Simplified).
    User specific request: "${userInput || 'None'}".`;
  }

  return await fetchFromProxy({
    model: "gemini-2.5-flash",
    contents: prompt
  });
}