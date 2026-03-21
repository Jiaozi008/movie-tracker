function sleep(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }

function parseRetryDelay(errorBody: string): number | null {
    try {
        const parsed = JSON.parse(errorBody);
        const retryInfo = parsed?.error?.details?.find((d: any) => d['@type']?.includes('RetryInfo'));
        if (retryInfo?.retryDelay) {
            const seconds = parseFloat(retryInfo.retryDelay);
            if (!isNaN(seconds)) return Math.ceil(seconds * 1000);
        }
        const match = parsed?.error?.message?.match(/retry in ([\d.]+)s/i);
        if (match) return Math.ceil(parseFloat(match[1]) * 1000);
    } catch { /* ignore */ }
    return null;
}

export const handler = async (event: any, context: any) => {
    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS, POST'
            },
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const apiKey = process.env.VITE_API_KEY;
    if (!apiKey) {
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Gemini API Key 未配置。' })
        };
    }

    let bodyData;
    try {
        bodyData = JSON.parse(event.body || '{}');
    } catch {
        return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Invalid JSON body' })
        };
    }

    const { model: modelTitle, contents } = bodyData;
    const model = modelTitle || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const reqBody = {
        contents: [{ parts: [{ text: contents }] }]
    };

    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reqBody)
            });

            if (response.ok) {
                const data = await response.json() as any;
                const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                return {
                    statusCode: 200,
                    headers: { 'Access-Control-Allow-Origin': '*' },
                    body: JSON.stringify({ text })
                };
            }

            const errorBody = await response.text();

            if (response.status === 429 && attempt < maxRetries) {
                const delayMs = parseRetryDelay(errorBody) || (30000 * (attempt + 1));
                console.log(`Rate limited (429). Retrying in ${Math.round(delayMs / 1000)}s...`);
                await sleep(delayMs);
                continue;
            }

            try {
                const parsed = JSON.parse(errorBody);
                const code = parsed?.error?.code;
                const msg = parsed?.error?.message || '';

                if (code === 429) {
                    throw new Error('AI 请求过于频繁，已超出免费额度限制。请稍等片刻后重试，或升级为付费计划。');
                }
                throw new Error(msg || errorBody);
            } catch (e: any) {
                if (e.message.startsWith('AI ')) throw e;
                throw new Error(errorBody);
            }
        } catch (error: any) {
            if (attempt === maxRetries) {
                return {
                    statusCode: 500,
                    headers: { 'Access-Control-Allow-Origin': '*' },
                    body: JSON.stringify({ error: error.message || 'AI 请求失败' })
                };
            }
        }
    }

    return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'AI 请求失败，已达最大重试次数。' })
    };
};
