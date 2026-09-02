import { Movie, GeminiMovieResponse } from "../types";

const PROXY_URL = import.meta.env.VITE_API_PROXY || '/api/gemini';
const PROXY_STREAM_URL = import.meta.env.VITE_API_PROXY ? `${import.meta.env.VITE_API_PROXY}/stream` : '/api/gemini/stream';

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

export async function fetchStreamFromProxy(
  payload: { model?: string; contents: string },
  onChunk?: (accumulatedText: string, latestChunk: string) => void
): Promise<string> {
  try {
    const res = await fetch(PROXY_STREAM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok || !res.body) {
      const fallbackText = await fetchFromProxy(payload);
      if (onChunk) onChunk(fallbackText, fallbackText);
      return fallbackText;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const jsonStr = trimmed.replace(/^data:\s*/, '');
        if (jsonStr === '[DONE]') continue;

        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed.error) {
            console.warn('Stream chunk error:', parsed.error);
            continue;
          }
          const chunkText = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (chunkText) {
            fullText += chunkText;
            if (onChunk) {
              onChunk(fullText, chunkText);
            }
          }
        } catch {
          // Ignore non-json lines
        }
      }
    }

    if (!fullText) {
      return await fetchFromProxy(payload);
    }

    return fullText;
  } catch (err) {
    console.warn('Streaming fetch fallback to standard fetch:', err);
    const fallbackText = await fetchFromProxy(payload);
    if (onChunk) onChunk(fallbackText, fallbackText);
    return fallbackText;
  }
}

export const fetchMovieMetadata = async (title: string): Promise<GeminiMovieResponse> => {
  const contents = `Provide metadata for the media title "${title}". Identify if it is a "movie" or "tv" series. Return JSON. ensure the summary, genre, country and director are in Chinese (Simplified). Include 2-4 concise, catchy Chinese tags (such as "悬疑烧脑", "温暖治愈", "赛博朋克", "高分神作") in the "tags" array field. Include an iconic classic quote or dialogue authentic to this specific film/show (in Chinese, without quotation marks, max 35 characters) in the "quote" field. If no famous quote exists, provide a memorable punchy 1-sentence highlight. If it is a TV series, estimate the total number of episodes and the average runtime per episode (in minutes). If it is a movie, provide the runtime (in minutes).`;

  // We specify these because we want JSON parsing
  const responseText = await fetchFromProxy({
    model: "gemini-2.5-flash",
    contents
  });

  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const cleanedJson = jsonMatch ? jsonMatch[0] : responseText;
    return JSON.parse(cleanedJson) as GeminiMovieResponse;
  } catch (e) {
    console.error("JSON Parse Error on proxy response:", e, responseText);
    throw new Error("AI 返回了无法解析的格式。");
  }
};

export const generateAiReview = async (
  title: string,
  rating: number,
  mediaType: string = 'movie',
  onChunk?: (accumulatedText: string, latestChunk: string) => void
): Promise<string> => {
  const typeText = mediaType === 'tv' ? "TV series" : "movie";
  const contents = `Write a short, casual, 2-sentence review for the ${typeText} "${title}" in Chinese (Simplified) giving it a rating of ${rating}/5 stars. Focus on the vibe.`;

  if (onChunk) {
    return await fetchStreamFromProxy({
      model: "gemini-2.5-flash",
      contents
    }, onChunk);
  }

  return await fetchFromProxy({
    model: "gemini-2.5-flash",
    contents
  });
};

export const generateAiQuote = async (
  title: string,
  mediaType: string = 'movie',
  year?: string,
  director?: string,
  overview?: string,
  onChunk?: (accumulatedText: string, latestChunk: string) => void
): Promise<string> => {
  const typeText = mediaType === 'tv' ? "电视剧/剧集" : "电影";
  const contextParts = [
    `作品名称: 《${title}》`,
    `类型: ${typeText}`,
    year ? `上映年份: ${year}` : '',
    director ? `导演/主创: ${director}` : '',
    overview ? `剧情简介: ${overview.slice(0, 120)}` : ''
  ].filter(Boolean).join('\n');

  const contents = `你是一个资深电影台词与经典金句研究专家。请为指定的影视作品提取或生成最经典、最震撼人心的台词或短评：

${contextParts}

严格要求：
1. 必须是《${title}》这部片子中真实出现过、最具辨识度与代表性的经典台词（必须精确匹配该片本身，严禁张冠李戴）。
2. 若该片为无对白短片、小众纪录片或无广泛流传的经典台词，请撰写一句极具电影美感、直击核心主题的灵光一现短评。
3. 纯简体中文输出，字数控制在 8 ~ 35 字以内，短小精悍，富有感染力。
4. 绝对不要添加任何书名号、双引号、作者角色标注或前后解释，只直接输出台词/金句本身。`;

  let quoteText = '';
  if (onChunk) {
    quoteText = await fetchStreamFromProxy({
      model: "gemini-2.5-flash",
      contents
    }, onChunk);
  } else {
    quoteText = await fetchFromProxy({
      model: "gemini-2.5-flash",
      contents
    });
  }

  return (quoteText || '')
    .trim()
    .replace(/^["“'「『\s]+/, '')
    .replace(/["”'」』\s]+$/, '')
    .trim();
};

export const translateToChinese = async (
  text: string,
  context: 'name' | 'genre' | 'country' | 'overview' | 'title' = 'name'
): Promise<string> => {
  if (!text || !text.trim()) return text;
  const trimmed = text.trim();

  // 若已经是纯中文/标点，直接返回节省请求时间
  if (/^[\u4e00-\u9fa5\s，、·！…（）—\d\-]+$/.test(trimmed)) {
    return trimmed;
  }

  let prompt = `你是一个专业的国际影视译者与汉化专家。请将以下待翻译文本准确翻译为地道、标准的简体中文。`;

  if (context === 'genre') {
    prompt += `
- 待翻译内容为影视类型/流派标签。
- "Sci-Fi & Fantasy" / "Sci-Fi and Fantasy" 翻译为 "科幻, 奇幻"
- "Action & Adventure" 翻译为 "动作, 冒险"
- "War & Politics" 翻译为 "战争, 政治"
- "Science Fiction" / "Sci-Fi" 翻译为 "科幻"
- "Fantasy" 翻译为 "奇幻"
- "Crime" 翻译为 "犯罪"
- "Mystery" 翻译为 "悬疑"
- "Thriller" 翻译为 "惊悚"
- "Animation" 翻译为 "动画"
- "Drama" 翻译为 "剧情"
- "Comedy" 翻译为 "喜剧"
- "Romance" 翻译为 "爱情"
- "Documentary" 翻译为 "纪录"
- "Horror" 翻译为 "恐怖"
- "Family" 翻译为 "家庭"
- 多个类型请用逗号与空格 ", " 分隔。`;
  } else if (context === 'name') {
    prompt += `
- 待翻译内容为影视导演、主演、编剧或制片人姓名（可能为英文、韩文、日文汉字/假名、法文、西班牙文、德文、俄文、泰文等多国语言）。
- 请提供中国大陆公认通用的简体中文译名（如 "Christopher Nolan" -> "克里斯托弗·诺兰", "Bong Joon-ho" / "봉준호" -> "奉俊昊", "Hayao Miyazaki" / "宮崎駿" -> "宫崎骏", "Denis Villeneuve" -> "丹尼斯·维伦纽瓦", "Park Chan-wook" / "박찬욱" -> "朴赞郁"）。
- 若包含多个人名（以逗号或斜杠分隔），请依次翻译并用逗号和空格 ", " 分隔保留。`;
  } else if (context === 'country') {
    prompt += `
- 待翻译内容为制片国家或地区。
- 请转换为标准的中文国名（如 "United States" -> "美国", "United Kingdom" -> "英国", "South Korea" -> "韩国", "Japan" -> "日本", "Australia" -> "澳大利亚"）。
- 多个国家请用 ", " 分隔。`;
  } else if (context === 'overview') {
    prompt += `
- 待翻译内容为影视作品的剧情简介梗概。
- 请翻译为通顺、优美、精炼且富有吸引力的简体中文影视故事梗概，保留原剧情核心脉络，语句流畅无翻译腔。`;
  } else if (context === 'title') {
    prompt += `
- 待翻译内容为影视作品外文原名。
- 请提供该作品在中国大陆公认通用的官方中文译名。`;
  }

  prompt += `\n\n待翻译文本: "${trimmed}"\n\n注意：只返回翻译后的纯文本结果，绝对不要带有任何说明、引号、问答前缀或解释。`;

  try {
    const res = await fetchFromProxy({
      model: "gemini-2.5-flash",
      contents: prompt
    });
    return (res || '')
      .trim()
      .replace(/^["“'「『]+/, '')
      .replace(/["”'」』]+$/, '')
      .trim() || trimmed;
  } catch (error) {
    console.error("Translation Error:", error);
    return trimmed;
  }
};

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