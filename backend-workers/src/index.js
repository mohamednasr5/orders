export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS configuration
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Direct R2 Bucket Access Route (Using the 'orders' binding)
    if (url.pathname.startsWith("/api/storage/")) {
      const key = url.pathname.slice(13); // remove "/api/storage/"
      
      if (request.method === 'GET') {
        const object = await env.orders.get(key);
        if (object === null) {
          return new Response('Object Not Found', { status: 404 });
        }
        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);
        headers.set('Access-Control-Allow-Origin', '*');
        return new Response(object.body, { headers });
      }
      
      if (request.method === 'PUT') {
        await env.orders.put(key, request.body);
        return new Response(`Object ${key} uploaded successfully!`, { headers: corsHeaders });
      }
    }

    return new Response(JSON.stringify({ 
      status: "SaaS OMS Backend Active", 
      project: env.FIREBASE_PROJECT_ID,
      publicR2: env.PUBLIC_R2_URL
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
};
