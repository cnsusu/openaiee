/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      // OpenRouter Api path (必须在其他 /v1 规则之前)
      {
        source: "/openrouter/:path*",
        destination: "/api/proxy",
      },
      // Claude Api path
      {
        source: "/v1/messages",
        destination: "/api/proxy",
      },
      {
        source: "/v1/complete",
        destination: "/api/proxy",
      },
      // OpenAI Api path
      {
        source: "/v1/:path*",
        destination: "/api/proxy",
      },
      // Gemini Api path
      {
        source: "/v1beta/:path*",
        destination: "/api/proxy",
      },
      // Groq Api path
      {
        source: "/openai/v1/:path*",
        destination: "/api/proxy",
      },
      {
        source: "/headers",
        destination: "/api/proxy",
      },
      {
        source: "/",
        destination: "/api/proxy"
      }
    ];
  },
};

module.exports = nextConfig;
