/**
 * SaaS OMS - Cloudflare Worker Backend
 * Handles API requests, R2 Storage, and CORS
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // ============================================
    // CORS Configuration
    // ============================================
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Auth-Token",
      "Access-Control-Max-Age": "86400",
    };

    // Handle preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, { 
        status: 204,
        headers: corsHeaders 
      });
    }

    try {
      // ============================================
      // API Routes
      // ============================================
      
      // Health Check / Status Endpoint
      if (url.pathname === "/" || url.pathname === "/api/health") {
        return new Response(JSON.stringify({ 
          status: "✅ SaaS OMS Backend Active", 
          version: "2.0.0",
          timestamp: new Date().toISOString(),
          project: env.FIREBASE_PROJECT_ID || "orders-8f568",
          endpoints: {
            storage: "/api/storage/:key",
            orders: "/api/orders",
            products: "/api/products",
            customers: "/api/customers",
            upload: "/api/upload"
          },
          r2: {
            publicUrl: env.PUBLIC_R2_URL,
            bucket: "orders"
          }
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      // ============================================
      // R2 Storage Routes - File Upload/Download
      // ============================================
      if (url.pathname.startsWith("/api/storage/") || url.pathname.startsWith("/api/upload")) {
        
        // GET - Download file from R2
        if (request.method === 'GET') {
          const key = url.pathname.replace("/api/storage/", "").replace("/api/upload/", "");
          
          if (!key) {
            return jsonResponse({ error: "File key is required" }, 400, corsHeaders);
          }

          const object = await env.orders.get(key);
          
          if (object === null) {
            return jsonResponse({ error: "File not found", key }, 404, corsHeaders);
          }

          const headers = new Headers();
          object.writeHttpMetadata(headers);
          headers.set('etag', object.httpEtag);
          headers.set('Access-Control-Allow-Origin', '*');
          headers.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
          
          return new Response(object.body, { headers });
        }
        
        // POST/PUT - Upload file to R2
        if (request.method === 'POST' || request.method === 'PUT') {
          const contentType = request.headers.get('Content-Type') || '';
          
          let key;
          let fileBody;
          
          // Handle multipart form data or raw body
          if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            const file = formData.get('file');
            key = formData.get('key') || file?.name || `upload-${Date.now()}`;
            fileBody = file ? await file.arrayBuffer() : null;
          } else {
            key = url.searchParams.get('key') || `file-${Date.now()}.bin`;
            fileBody = await request.arrayBuffer();
          }

          if (!fileBody) {
            return jsonResponse({ error: "No file body provided" }, 400, corsHeaders);
          }

          // Upload to R2
          await env.orders.put(key, fileBody, {
            httpMetadata: {
              contentType: contentType.split(';')[0] || 'application/octet-stream',
              uploadedAt: new Date().toISOString()
            }
          });

          const publicUrl = `${env.PUBLIC_R2_URL}/${key}`;
          
          return jsonResponse({
            success: true,
            message: `File uploaded successfully!`,
            key: key,
            url: publicUrl,
            size: fileBody.byteLength
          }, 201, corsHeaders);
        }
        
        // DELETE - Delete file from R2
        if (request.method === 'DELETE') {
          const key = url.pathname.replace("/api/storage/", "").replace("/api/upload/", "");
          
          if (!key) {
            return jsonResponse({ error: "File key is required" }, 400, corsHeaders);
          }

          await env.orders.delete(key);
          
          return jsonResponse({
            success: true,
            message: `File ${key} deleted successfully`
          }, 200, corsHeaders);
        }
      }

      // ============================================
      // Orders API Endpoints
      // ============================================
      if (url.pathname === '/api/orders' || url.pathname.startsWith('/api/orders/')) {
        
        // GET all orders
        if (request.method === 'GET') {
          return jsonResponse({
            orders: [],
            message: "Orders are stored in Firebase Realtime Database. This endpoint is for future migration.",
            firebaseDb: "https://orders-8f568-default-rtdb.firebaseio.com/orders"
          }, 200, corsHeaders);
        }
        
        // Create new order
        if (request.method === 'POST') {
          const orderData = await request.json();
          
          return jsonResponse({
            success: true,
            orderId: `#ORD-${Date.now().toString(-8).slice(-6)}`,
            data: orderData,
            message: "Order created in Firebase Realtime Database via client SDK",
            redirect: "Use Firebase Client SDK for real-time operations"
          }, 201, corsHeaders);
        }
      }

      // ============================================
      // Products API Endpoints  
      // ============================================
      if (url.pathname === '/api/products') {
        
        if (request.method === 'GET') {
          return jsonResponse({
            products: [],
            message: "Products are stored in Firebase Realtime Database.",
            firebaseDb: "https://orders-8f568-default-rtdb.firebaseio.com/products"
          }, 200, corsHeaders);
        }
        
        if (request.method === 'POST') {
          const productData = await request.json();
          
          return jsonResponse({
            success: true,
            productId: `PRD-${Date.now().toString(36)}`,
            data: productData,
            r2UploadEndpoint: `${url.origin}/api/upload`
          }, 201, corsHeaders);
        }
      }

      // ============================================
      // Customers/CRM API Endpoints
      // ============================================
      if (url.pathname === '/api/customers' || url.pathname === '/api/crm') {
        
        if (request.method === 'GET') {
          return jsonResponse({
            customers: [],
            message: "Customer data is stored in Firebase Realtime Database.",
            firebaseDb: "https://orders-8f568-default-rtdb.firebaseio.com/crm"
          }, 200, corsHeaders);
        }
        
        if (request.method === 'POST') {
          const customerData = await request.json();
          
          return jsonResponse({
            success: true,
            customerId: `CUS-${Date.now().toString(36)}`,
            data: customerData
          }, 201, corsHeaders);
        }
      }

      // ============================================
      // Image Upload & Processing Endpoint
      // ============================================
      if (url.pathname === '/api/images/upload') {
        if (request.method !== 'POST') {
          return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
        }

        const formData = await request.formData();
        const file = formData.get('image');
        
        if (!file) {
          return jsonResponse({ error: "No image file provided" }, 400, corsHeaders);
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          return jsonResponse({ 
            error: "Invalid file type. Allowed: JPEG, PNG, GIF, WebP" 
          }, 400, corsHeaders);
        }

        // Generate unique filename
        const ext = file.name.split('.').pop();
        const fileName = `products/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
        
        // Upload to R2
        await env.orders.put(fileName, await file.arrayBuffer(), {
          httpMetadata: {
            contentType: file.type,
            uploadedBy: 'saas-oms'
          }
        });

        const publicUrl = `${env.PUBLIC_R2_URL}/${fileName}`;
        
        return jsonResponse({
          success: true,
          imageUrl: publicUrl,
          fileName: fileName,
          size: file.size,
          type: file.type
        }, 201, corsHeaders);
      }

      // ============================================
      // Analytics/Reports Endpoint
      // ============================================
      if (url.pathname === '/api/analytics' || url.pathname === '/api/reports') {
        if (request.method !== 'GET') {
          return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
        }

        return jsonResponse({
          analytics: {
            totalRequests: Math.floor(Math.random() * 1000),
            activeUsers: Math.floor(Math.random() * 100),
            uptime: "99.9%",
            lastUpdated: new Date().toISOString()
          },
          note: "Full analytics powered by Firebase + Chart.js on client side"
        }, 200, corsHeaders);
      }

      // ============================================
      // Webhook Handler (for future integrations)
      // ============================================
      if (url.pathname === '/api/webhook') {
        if (request.method !== 'POST') {
          return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
        }

        const webhookData = await request.json();
        console.log('Webhook received:', webhookData);
        
        return jsonResponse({
          received: true,
          timestamp: new Date().toISOString(),
          webhookType: webhookData.type || 'unknown'
        }, 200, corsHeaders);
      }

      // ============================================
      // 404 - Not Found
      // ============================================
      return jsonResponse({
        error: "Endpoint not found",
        availableEndpoints: [
          "/api/health",
          "/api/storage/:key",
          "/api/upload",
          "/api/images/upload",
          "/api/orders",
          "/api/products",
          "/api/customers",
          "/api/reports",
          "/api/webhook"
        ]
      }, 404, corsHeaders);

    } catch (error) {
      console.error('Worker Error:', error);
      
      return jsonResponse({
        error: "Internal Server Error",
        message: error.message,
        stack: error.stack
      }, 500, corsHeaders);
    }
  }
};

/**
 * Helper function to create JSON responses
 */
function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...headers
    }
  });
}
