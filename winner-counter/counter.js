export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const key = "winner";

    // increment if ?inc is present
    if (url.searchParams.has("inc")) {
      let n = Number(await env.COUNTER.get(key)) || 0;
      n++;
      await env.COUNTER.put(key, n);
      return new Response(String(n), {
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }

    // otherwise just return current value
    const n = await env.COUNTER.get(key) || "0";
    return new Response(n, {
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  }
}; 