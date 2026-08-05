# SaaS OMS - Deployment Guide
# دليل النشر والتشغيل

## 📋 المحتويات
1. Firebase Realtime Database Setup
2. Cloudflare Workers Deployment
3. R2 Bucket Configuration
4. Environment Variables

---

## 🔥 1. Firebase Realtime Database

### الخطوة 1: إنشاء المشروع
1. اذهب إلى [Firebase Console](https://console.firebase.google.com/)
2. أنشئ مشروع جديد أو اختر مشروع موجود
3. فعّل **Realtime Database** من القائمة

### الخطوة 2: إعدادات قواعد الأمان (Rules)
1. افتح **Realtime Database** في Firebase Console
2. اضغط على تبويب **Rules**
3. امسح القواعد الحالية والصق التالي:

```json
{
  "rules": {
    "orders": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "products": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "crm": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "movements": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

4. اضغط **Publish**

### الخطوة 3: تفعيل Authentication
1. اذهب إلى **Authentication** → **Sign-in method**
2. فعّل **Google** كطريقة تسجيل دخول
3. أضف **Project Support Email**
4. انسخ معرف العميل (Client ID) إذا لزم

### الخطوة 4: استيراد البيانات التجريبية (اختياري)
1. افتح **Realtime Database** → **Data**
2. اضغط على ⋮ (ثلاث نقاط) → **Import JSON**
3. اختر ملف `firebase-database-structure.json`
4. اضغط **Import**

---

## ☁️ 2. Cloudflare Workers Deployment

### المتطلبات المسبقة
```bash
# تثبيت Wrangler CLI
npm install -g wrangler

# تسجيل الدخول
wrangler login
```

### النشر
```bash
# انتقل لمجلد الـ Worker
cd backend-workers

# نشر للإنتاج
wrangler deploy

# أو نشر للتجربة
wrangler deploy --env development
```

### اختبار الـ Worker
```bash
# اختبار محلي
wrangler dev

# اختبار Endpoints
curl https://your-worker.workers.dev/api/health
curl -X POST https://your-worker.workers.dev/api/upload \
  -F "file=@image.jpg" \
  -F "key=products/test-image.jpg"
```

---

## 📦 3. R2 Bucket Configuration

### إنشاء R2 Bucket
```bash
# إنشاء bucket جديد
wrangler r2 bucket create orders

# رفع ملفات تجريبية
wrangler r2 object put orders/sample.jpg --file=./sample.jpg
```

### إعدادات Public Access
1. اذهب إلى [Cloudflare Dashboard](https://dash.cloudflare.com)
2. اختر **R2 Object Storage**
3. اختر bucket `orders`
4. فعّل **Public Access**
5. انسخ **Public Endpoint URL**

---

## 🔧 4. تحديث الإعدادات في الكود

### firebase-config.js
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com", // ← غيّر هذا
  projectId: "YOUR_PROJECT_ID",           // ← غيّر هذا
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### wrangler.toml
```toml
[vars]
FIREBASE_PROJECT_ID = "your-project-id"   # ← غيّر هذا
PUBLIC_R2_URL = "https://your-pub-id.r2.dev" # ← غيّر هذا
```

---

## ✅ فحص التشغيل

### قائمة التحقق
- [ ] Firebase Realtime Database مفعل
- [ ] Rules منشورة
- [ ] Google Auth مفعل
- [ ] Cloudflare Worker يعمل
- [ ] R2 Bucket عام (Public)
- [ ] البيانات التجريبة مستوردة

### اختبار سريع
1. افتح `index.html` في المتصفح
2. اضغط **تسجيل الدخول باستخدام Google**
3. يجب أن تظهر لوحة القيادة مع البيانات

---

## 🔗 الروابط المهمة

| الخدمة | الرابط |
|--------|--------|
| Firebase Console | https://console.firebase.google.com |
| Realtime DB | https://console.firebase.google.com/project/orders-8f568/database |
| Authentication | https://console.firebase.google.com/project/orders-8f568/authentication |
| Cloudflare Dashboard | https://dash.cloudflare.com |
| Workers | https://dash.cloudflare.com/?to=/:account/workers |
| R2 Storage | https://dash.cloudflare.com/?to=/:account/r2 |

---

## ❓ المساعدة والمشاكل الشائعة

### مشكلة: Popup blocked
**الحل:** فعّل Popups في المتصفح أو أضف الموقع للاستثناءات

### مشكلة: CORS Error
**الحل:** تأكد من إعدادات CORS في Worker و Firebase

### مشكلة: Permission Denied
**الحل:** تحقق من Firebase Rules وتأكد من تسجيل الدخول

---

**مطور بواسطة:** SaaS OMS Team  
**الإصدار:** 2.0.0  
**آخر تحديث:** 2024
