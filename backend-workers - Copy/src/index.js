/**
 * ========================================
 * SaaS OMS - Cloudflare Worker Backend
 * ========================================
 *
 * يتعامل مع:
 * ✅ API Endpoints
 * ✅ R2 Storage (ملفات وصور)
 * ✅ CORS Headers
 * ✅ Error Handling
 */

// ========================================
// CORS Configuration
// ========================================
const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Auth-Token, X-Custom-Header",
    "Access-Control-Max-Age": "86400",
};

// ========================================
// Configuration
// ========================================
const CONFIG = {
    API_VERSION: "2.0.0",
    PROJECT_ID: "orders-8f568",
    MAX_FILE_SIZE: 50 * 1024 * 1024,
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    ALLOWED_FILE_TYPES: [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
};

// ========================================
// Main Worker Handler
// ========================================
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        try {
            if (method === "OPTIONS") {
                return createCorsResponse(null, 204);
            }

            console.log(`📝 ${method} ${path}`);

            if (path === "/" || path === "/api/health") {
                return handleHealth(env);
            }

            if (path.startsWith("/api/storage") || path.startsWith("/api/upload")) {
                return handleStorage(request, env, path);
            }

            if (path === "/api/images/upload") {
                return handleImageUpload(request, env);
            }

            if (path === "/api/orders" || path.startsWith("/api/orders/")) {
                return handleOrders(request, path, method);
            }

            if (path === "/api/products" || path.startsWith("/api/products/")) {
                return handleProducts(request, path, method);
            }

            if (path === "/api/customers" || path === "/api/crm") {
                return handleCustomers(request, method);
            }

            // Analytics - بيانات حقيقية من Firebase Realtime Database
            if (path === "/api/analytics" || path === "/api/reports") {
                return handleAnalytics(env);
            }

            if (path === "/api/export") {
                return handleExport(env);
            }

            return jsonResponse({
                error: "❌ Endpoint not found",
                path: path,
                availableEndpoints: getAvailableEndpoints(),
                hint: "استخدم أحد الـ endpoints المتاحة أعلاه"
            }, 404);

        } catch (error) {
            console.error("❌ Worker Error:", error);
            return jsonResponse({
                error: "Internal Server Error",
                message: error.message,
                status: "error"
            }, 500);
        }
    }
};

// ========================================
// Route Handlers
// ========================================

function handleHealth(env) {
    return jsonResponse({
        status: "✅ SaaS OMS Backend Active",
        version: CONFIG.API_VERSION,
        timestamp: new Date().toISOString(),
        project: CONFIG.PROJECT_ID,
        database: {
            type: "Firebase Realtime Database",
            url: env.FIREBASE_DATABASE_URL || "https://orders-8f568-default-rtdb.firebaseio.com"
        },
        storage: {
            type: "Cloudflare R2",
            bucket: env.R2_BUCKET || "orders",
            publicUrl: env.PUBLIC_R2_URL
        },
        endpoints: getAvailableEndpoints()
    });
}

async function handleStorage(request, env, path) {
    const method = request.method;
    if (method === "GET") return handleStorageGet(env, path);
    if (method === "POST" || method === "PUT") return handleStorageUpload(request, env, path);
    if (method === "DELETE") return handleStorageDelete(env, path);
    return jsonResponse({ error: "Method not allowed" }, 405);
}

async function handleStorageGet(env, path) {
    const key = extractKey(path);
    if (!key) return jsonResponse({ error: "File key is required" }, 400);

    try {
        const bucket = env.orders;
        const object = await bucket.get(key);
        if (!object) return jsonResponse({ error: "File not found", key }, 404);

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set("etag", object.httpEtag);
        headers.set("Cache-Control", "public, max-age=86400");
        Object.entries(CORS_HEADERS).forEach(([k, v]) => headers.set(k, v));

        return new Response(object.body, { headers, status: 200 });
    } catch (error) {
        console.error("Storage GET error:", error);
        return jsonResponse({ error: error.message }, 500);
    }
}

async function handleStorageUpload(request, env, path) {
    try {
        const contentType = request.headers.get("Content-Type") || "application/octet-stream";
        let key = null;
        let fileBody = null;

        if (contentType.includes("multipart/form-data")) {
            const formData = await request.formData();
            const file = formData.get("file");
            if (!file) return jsonResponse({ error: "No file provided" }, 400);
            key = formData.get("key") || sanitizeFileName(file.name);
            fileBody = await file.arrayBuffer();
        } else {
            key = new URL(request.url).searchParams.get("key") || `file-${Date.now()}`;
            fileBody = await request.arrayBuffer();
        }

        if (fileBody.byteLength > CONFIG.MAX_FILE_SIZE) {
            return jsonResponse({
                error: "File too large",
                maxSize: `${CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB`,
                fileSize: `${fileBody.byteLength / 1024 / 1024}MB`
            }, 413);
        }

        const bucket = env.orders;
        await bucket.put(key, fileBody, {
            httpMetadata: { contentType: contentType.split(";")[0] }
        });

        const publicUrl = `${env.PUBLIC_R2_URL}/${key}`;

        return jsonResponse({
            success: true,
            message: "✅ File uploaded successfully",
            key, url: publicUrl,
            size: fileBody.byteLength,
            contentType,
            timestamp: new Date().toISOString()
        }, 201);
    } catch (error) {
        console.error("Upload error:", error);
        return jsonResponse({ error: error.message }, 500);
    }
}

async function handleStorageDelete(env, path) {
    const key = extractKey(path);
    if (!key) return jsonResponse({ error: "File key is required" }, 400);

    try {
        const bucket = env.orders;
        await bucket.delete(key);
        return jsonResponse({
            success: true,
            message: `✅ File deleted: ${key}`,
            key,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Delete error:", error);
        return jsonResponse({ error: error.message }, 500);
    }
}

async function handleImageUpload(request, env) {
    if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

    try {
        const contentType = request.headers.get("Content-Type");
        if (!contentType?.includes("multipart/form-data")) {
            return jsonResponse({ error: "Content-Type must be multipart/form-data" }, 400);
        }

        const formData = await request.formData();
        const file = formData.get("image");
        if (!file) return jsonResponse({ error: "No image file provided" }, 400);

        if (!CONFIG.ALLOWED_IMAGE_TYPES.includes(file.type)) {
            return jsonResponse({
                error: "Invalid image type",
                allowed: CONFIG.ALLOWED_IMAGE_TYPES,
                provided: file.type
            }, 400);
        }

        if (file.size > 10 * 1024 * 1024) {
            return jsonResponse({ error: "Image too large (max 10MB)", size: `${file.size / 1024 / 1024}MB` }, 413);
        }

        const ext = file.name.split(".").pop();
        const fileName = `products/${Date.now()}-${generateRandomString(9)}.${ext}`;

        const bucket = env.orders;
        await bucket.put(fileName, await file.arrayBuffer(), {
            httpMetadata: { contentType: file.type }
        });

        const publicUrl = `${env.PUBLIC_R2_URL}/${fileName}`;

        return jsonResponse({
            success: true,
            imageUrl: publicUrl,
            fileName,
            size: file.size,
            type: file.type,
            timestamp: new Date().toISOString()
        }, 201);
    } catch (error) {
        console.error("Image upload error:", error);
        return jsonResponse({ error: error.message }, 500);
    }
}

function handleOrders(request, path, method) {
    if (method === "GET") {
        return jsonResponse({
            message: "✅ Orders endpoint",
            description: "البيانات مخزنة في Firebase Realtime Database - استخدم Firebase Client SDK من الواجهة مباشرة",
            firebaseDb: "https://orders-8f568-default-rtdb.firebaseio.com/orders",
            requiredFields: ["customer", "amount", "status", "date"],
            statusOptions: ["pending", "processing", "shipped", "delivered", "cancelled"]
        });
    }
    return jsonResponse({ error: "Method not allowed" }, 405);
}

function handleProducts(request, path, method) {
    if (method === "GET") {
        return jsonResponse({
            message: "✅ Products endpoint",
            firebaseDb: "https://orders-8f568-default-rtdb.firebaseio.com/products",
            categories: ["electronics", "clothing", "food", "other"]
        });
    }
    return jsonResponse({ error: "Method not allowed" }, 405);
}

function handleCustomers(request, method) {
    if (method === "GET") {
        return jsonResponse({
            message: "✅ Customers/CRM endpoint",
            firebaseDb: "https://orders-8f568-default-rtdb.firebaseio.com/crm"
        });
    }
    return jsonResponse({ error: "Method not allowed" }, 405);
}

/**
 * Analytics Handler - يقرأ بيانات حقيقية من Firebase Realtime Database
 * FIREBASE_DATABASE_SECRET: متغير سري اختياري (Cloudflare secret) لقراءة محمية
 */
async function handleAnalytics(env) {
    const dbUrl = env.FIREBASE_DATABASE_URL || "https://orders-8f568-default-rtdb.firebaseio.com";
    const secret = env.FIREBASE_DATABASE_SECRET;

    try {
        const authParam = secret ? `?auth=${secret}` : "";
        const [ordersRes, crmRes] = await Promise.all([
            fetch(`${dbUrl}/orders.json${authParam}`),
            fetch(`${dbUrl}/crm.json${authParam}`)
        ]);

        const orders = (await ordersRes.json()) || {};
        const crm = (await crmRes.json()) || {};

        const ordersList = Object.values(orders);
        const totalOrders = ordersList.length;
        const totalRevenue = ordersList.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
        const pendingOrders = ordersList.filter(o => o.status === 'pending').length;
        const totalCustomers = Object.keys(crm).length;

        return jsonResponse({
            analytics: {
                totalOrders,
                totalRevenue,
                pendingOrders,
                totalCustomers,
                lastUpdated: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error("Analytics error:", error);
        return jsonResponse({ error: "تعذر جلب الإحصائيات الحقيقية", message: error.message }, 500);
    }
}

async function handleExport(env) {
    return jsonResponse({
        message: "✅ Export endpoint",
        formats: ["csv", "json", "excel"],
        hint: "الاستخدام: /api/export?format=csv&collection=orders"
    });
}

// ========================================
// Helper Functions
// ========================================

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data, null, 2), {
        status,
        headers: { "Content-Type": "application/json; charset=utf-8", ...CORS_HEADERS }
    });
}

function createCorsResponse(body, status = 200) {
    return new Response(body, { status, headers: CORS_HEADERS });
}

function extractKey(path) {
    return path.replace("/api/storage/", "").replace("/api/upload/", "").split("?")[0];
}

function sanitizeFileName(filename) {
    return filename.replace(/[^a-zA-Z0-9._-]/g, "_").substring(0, 255);
}

function generateRandomString(length) {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function getAvailableEndpoints() {
    return {
        health: { method: "GET", path: "/api/health" },
        storage: { method: "GET, POST, PUT, DELETE", path: "/api/storage/:key" },
        upload: { method: "POST", path: "/api/upload" },
        imageUpload: { method: "POST", path: "/api/images/upload" },
        orders: { method: "GET", path: "/api/orders" },
        products: { method: "GET", path: "/api/products" },
        customers: { method: "GET", path: "/api/customers" },
        analytics: { method: "GET", path: "/api/analytics" },
        export: { method: "GET", path: "/api/export" }
    };
}
