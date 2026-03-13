import type { NextRequest } from 'next/server';

export const config = {
  runtime: 'edge'
};

export default async function handler(req: NextRequest) {
  const url = new URL(req.url);

  // OpenRouter API - openrouter.ai/api/v1/...
  if (url.pathname.startsWith('/openrouter/')) {
    url.host = 'openrouter.ai';
    // 将 /openrouter/v1/... 转换为 /api/v1/...
    url.pathname = '/api' + url.pathname.replace('/openrouter', '');
  } else if (url.pathname.startsWith('/v1beta')) {
    url.host = 'generativelanguage.googleapis.com';
  } else if (url.pathname.startsWith('/headers')) {
    url.host = 'httpbin.org';
  } else if (url.pathname.startsWith('/openai/v1')) {
    url.host = 'api.groq.com';
  } else if (url.pathname.startsWith('/v1/messages') || url.pathname.startsWith('/v1/completions')) {
    // Claude API endpoints
    url.host = 'api.anthropic.com';
  } else {
    url.host = 'api.openai.com';
  }

  url.protocol = 'https:';
  url.port = '';

  const headers = new Headers();

  // Set essential headers
  headers.set('host', url.host);
  headers.set('accept', '*/*');
  headers.set('content-type', req.headers.get('content-type') || 'application/json');

  // Only transfer specific headers from the original request
  // OpenRouter headers: HTTP-Referer, X-Title for rankings
  // anthropic-version for Claude API
  const allowedHeaders = [
    'authorization',
    'content-length',
    'x-api-key',
    'http-referer',
    'x-title',
    'anthropic-version'
  ];
  for (const header of allowedHeaders) {
    const value = req.headers.get(header);
    if (value) {
      headers.set(header, value);
    }
  }

  try {
    const { method, body, signal } = req;

    const response = await fetch(
      url.toString(),
      {
        method,
        headers,
        body,
        signal,
      }
    );

    // Clone the response and modify its headers
    const modifiedResponse = new Response(response.body, response);
    modifiedResponse.headers.delete('cf-ray');
    modifiedResponse.headers.delete('cf-cache-status');
    modifiedResponse.headers.delete('report-to');
    modifiedResponse.headers.delete('nel');

    return modifiedResponse;
  } catch (error) {
    console.error('Proxy error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
