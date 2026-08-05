# شحنلي (ShipLi) - نظام إدارة الشحن الاحترافي

## 🚀 Professional Shipping Management PWA

نظام متكامل لإدارة الشحن واللوجستيات يعمل كتطبيق ويب تقدمي (PWA) مع دعم كامل للغة العربية.

---

## ✨ المميزات الرئيسية

### 📦 إدارة الشحنات
- إنشاء بوليصات شحن جديدة
- تتبع الشحنات في الوقت الفعلي
- تحديث حالة الشحنات
- طباعة البوليصات والباركودات

### ▮▯▮▯▮ الباركود
- توليد باركود تلقائي لكل شحنة
- طباعة الباركود
- تحميل الباركود كصورة
- مسح الباركود بالكاميرا

### 👥 إدارة العملاء (CRM)
- إضافة وتعديل وحذف العملاء
- حفظ بيانات العملاء للتسريع
- عرض سجل شحنات كل عميل

### ⚙️ تخصيص المتجر
- رفع شعار المتجر
- تغيير اسم المتجر
- إعدادات الشحن الافتراضية
- تفعيل/تعطيل الإشعارات

### 📱 PWA احترافي
- **تثبيت فعلي** (ليس مجرد اختصار)
- يعمل بدون إنترنت
- إشعارات فورية
- تحديثات تلقائية

### 🔥 Firebase Integration
- مزامنة تلقائية مع Firebase
- قاعدة بيانات Realtime
- تخزين الصور
- مصادقة المستخدمين

---

## 📋 المتطلبات

- متصفح حديث (Chrome, Firefox, Edge, Safari)
- اتصال إنترنت للمزامنة الأولى
- Firebase Account (مضبوط مسبقاً)

---

## 🚀 التشغيل السريع

### الطريقة 1: فتح مباشر
1. فك ضغط الملف `shipping-pwa.zip`
2. افتح ملف `index.html` في المتصفح

### الطريقة 2: استخدام Local Server (موصى به)
```bash
# باستخدام Python
python -m http.server 8080

# أو باستخدام Node.js
npx serve .

# أو باستخدام PHP
php -S localhost:8080
```
ثم افتح: `http://localhost:8080`

### الطريقة 3: نشر على استضافة
1. ارفع جميع الملفات إلى الاستضافة
2. تأكد من دعم HTTPS (مطلوب لـ PWA)
3. جاهز! 🎉

---

## 📁 هيكل المشروع

```
shipping-pwa/
├── index.html          # الصفحة الرئيسية
├── styles.css          # الأنماط والتصميم
├── app.js              # المنطق والوظائف
├── manifest.json       # إعدادات PWA
├── sw.js               # Service Worker
├── icons/              # أيقونات التطبيق
│   ├── icon-72.png
│   ├── icon-96.png
│   ├── icon-128.png
│   ├── icon-144.png
│   ├── icon-152.png
│   ├── icon-192.png
│   ├── icon-384.png
│   └── icon-512.png
├── assets/             # صور وموارد إضافية
└── pages/              # صفحات إضافية (مستقبلية)
```

---

## ⚙️ إعدادات Firebase

المشروع مضبوط مسبقاً على Firebase:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyDNWeuRszXCZgmyIEyRwdKK1KaTp1SLn_I",
    authDomain: "orders-8f568.firebaseapp.com",
    databaseURL: "https://orders-8f568-default-rtdb.firebaseio.com",
    projectId: "orders-8f568",
    storageBucket: "orders-8f568.firebasestorage.app",
    messagingSenderId: "1029204669334",
    appId: "1:1029204669334:web:7df3d26ebd51d353abe3b7"
};
```

---

## 🌐 دعم المتصفحات

| المتصفح | الإصدار الأدنى |
|---------|---------------|
| Chrome | 80+ |
| Firefox | 78+ |
| Safari | 14+ |
| Edge | 80+ |

---

## 📱 PWA Features

✅ **Installable** - يمكن تثبيته كتطبيق منفصل  
✅ **Offline Support** - يعمل بدون إنترنت  
✅ **Push Notifications** - إشعارات فورية  
✅ **Auto Updates** - تحديثات تلقائية  
✅ **Fast Loading** - تحميل سريع مع التخزين المؤقت  

---

## 🛠️ التقنيات المستخدمة

- **HTML5** - هيكل الصفحات
- **CSS3** - تصميم متجاوب مع RTL
- **JavaScript ES6+** - المنطق والتفاعلات
- **Firebase** - قاعدة البيانات والمصادقة
- **JsBarcode** - توليد الباركودات
- **Service Worker** - عمل offline
- **Web App Manifest** - خصائص PWA

---

## 📞 الدعم

للمساعدة أو الاستفسارات، تواصل معنا.

---

## 📄 الترخيص

© 2026 شحنلي - جميع الحقوق محفوظة

---

**Made with ❤️ for Arabic Shipping Industry**
