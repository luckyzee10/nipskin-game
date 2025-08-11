export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const key = "winner";

    // Allowed origins for browser CORS
    const allowedOrigins = new Set([
      "https://nipskinplay.com",
      "https://www.nipskinplay.com",
      "http://localhost:8000",
    ]);

    const origin = request.headers.get("Origin") || "";
    const isCorsAllowed = allowedOrigins.has(origin);
    const corsHeaders = isCorsAllowed
      ? {
          "Access-Control-Allow-Origin": origin,
          "Vary": "Origin",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Cache-Control": "no-store",
        }
      : { "Cache-Control": "no-store" };

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const readCurrent = async () => {
      const raw = (await env.COUNTER.get(key)) || "0";
      const digitsOnly = String(raw).replace(/[^0-9]/g, "");
      const parsed = Number.parseInt(digitsOnly || "0", 10);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    // POST /increment → atomically increment & return new total
    if (request.method === "POST" && url.pathname === "/increment") {
      // If a browser request, require allowed Origin
      if (origin && !isCorsAllowed) {
        return new Response("Forbidden", { status: 403 });
      }

      const current = (await readCurrent()) + 1;
      await env.COUNTER.put(key, String(current));
      return new Response(String(current), { headers: corsHeaders });
    }

    // GET → just return current total (read-only)
    const current = await readCurrent();
    return new Response(String(current), { headers: corsHeaders });
  },
};