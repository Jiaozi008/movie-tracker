const TMDB_BASE = 'https://api.themoviedb.org/3';

// TMDB API Key 在服务端注入，不会暴露给客户端浏览器
// 客户端请求时无需携带 api_key，由此代理统一管理认证
const SERVER_TMDB_API_KEY = 'b208d078b43b1466eff7dd2689220074';

interface Env {
    TMDB_API_KEY?: string;
    VITE_TMDB_API_KEY?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
    const { request, params, env } = context;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
            }
        });
    }

    try {
        const url = new URL(request.url);
        const subPath = Array.isArray(params.path) ? params.path.join('/') : (params.path || '');

        // 服务端注入 API Key：优先从 Cloudflare 环境变量读取，否则使用内置 Key
        const serverApiKey = env.TMDB_API_KEY || env.VITE_TMDB_API_KEY || SERVER_TMDB_API_KEY;
        const searchParams = new URLSearchParams(url.searchParams);
        if (serverApiKey) {
            searchParams.set('api_key', serverApiKey);
        }

        const query = searchParams.toString();
        const targetUrl = `${TMDB_BASE}/${subPath}${query ? `?${query}` : ''}`;

        const upstreamRes = await fetch(targetUrl, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) CineLog/1.0'
            }
        });

        const data = await upstreamRes.text();

        return new Response(data, {
            status: upstreamRes.status,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': upstreamRes.headers.get('Content-Type') || 'application/json; charset=utf-8',
                'Cache-Control': 'public, max-age=3600'
            }
        });
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message || 'TMDB Proxy Error' }), {
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            }
        });
    }
};
