export default {
  async fetch(request, env) {
    const key = "winner";

    // POST (any path) → atomically increment & return new total
    if (request.method === "POST") {
      let n = Number(await env.COUNTER.get(key)) || 0;
      n++;
      await env.COUNTER.put(key, n);
      return new Response(String(n));
    }

    // GET → just return current total
    const n = await env.COUNTER.get(key) || "0";
    return new Response(n);
  }
};
