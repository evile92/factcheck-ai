# دليل التثبيت والتشغيل (Setup Guide) 🛠️

يوضح هذا الدليل كيفية تشغيل تطبيق **FactCheck AI** محلياً على بيئة التطوير.

---

## 📋 المتطلبات الأساسية
- **Node.js**: الإصدار 18 أو 20 أو 22+ (تم التحقق على Node v24).
- **مدير الحزم**: `npm` (الإصدار 9+).
- **نظام التشغيل**: Windows / macOS / Linux (تم تكييف أوامر Windows مع سياسات PowerShell).

---

## ⚡ خطوات التثبيت خطوة بخطوة

### 1. استنساخ المستودع أو الانتقال إلى مجلد المشروع
```bash
cd "C:\Users\PC Paradise\.gemini\antigravity\scratch\factcheck-ai"
```

### 2. تثبيت الاعتماديات (Dependencies)
```bash
# على أنظمة ويندوز (PowerShell)
npm.cmd install

# أو على أنظمة Linux/macOS
npm install
```

جميع الحزم مصممة لتعمل بدون أي متطلبات ثنائية خارجية (Zero External C++ Binaries):
- محرك الـ OCR يعمل عبر `@tesseract.js` المترجم بتقنية WebAssembly.
- استخراج البيانات الوصفية يعمل بمكتبة `exifr` النقية.
- الفحص الأمني لـ SSRF مدمج عبر مكتبة `node:dns/promises`.

---

### 3. إعداد متغيرات البيئة (Environment Variables)
انسخ ملف `.env.example` إلى `.env.local`:
```bash
cp .env.example .env.local
```

> **ملاحظة مهمة:** التطبيق مهيأ ليعمل بنجاح **100% فورياً حتى بدون إدخال أي مفاتيح API**، حيث يعتمد على مزودات مجانية مفتوحة (Wikipedia REST API، GDELT Project Database، Google News Live RSS، CrossRef Scholarly API، و DuckDuckGo).
> إذا أردت توسيع حدود الطلبات أو تفعيل واجهة Google Fact Check Tools الرسمية، ضع المفتاح في `.env.local`:
> ```env
> GOOGLE_FACT_CHECK_API_KEY=your_api_key_here
> ```

---

### 4. تشغيل خادم التطوير (Development Server)
```bash
# على Windows PowerShell
npm.cmd run dev

# أو
npm run dev
```

افتح المتصفح وانتقل إلى:
👉 **`http://localhost:3000`**

---

### 5. تشغيل الاختبارات المؤتمتة (Running Tests)
```bash
npm.cmd test
# أو
npx.cmd vitest run
```

---

## 🛡️ إرشادات الأمان والإنتاج
1. **SSRF Guard:** تم تفعيل حماية تمنع جلب أي عناوين تنتمي لشبكات محلية (127.0.0.1, localhost, 10.x, 192.168.x, 169.254.169.254).
2. **Rate Limiting:** الخادم مزود بحاجز تدفق طلبات بحد أقصى 60 طلباً بالدقيقة لكل عميل.
3. **تنظيف الملفات:** لا يتم تخزين أي صور أو فيديوهات مرفوعة على القرص بشكل دائم.
