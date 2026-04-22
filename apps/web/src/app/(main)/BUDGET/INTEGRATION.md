# دليل الربط بالمنصة الأم (Parent Platform Integration Guide)

## نظرة عامة

هذا التطبيق (FilmBudget AI Pro) جاهز للدمج مع المنصة الأم بطرق متعددة ومرنة.

## طرق الدمج

### 1. الاستخدام كوحدة مستقلة (Standalone Module)

التطبيق مُعد بالفعل للعمل بشكل مستقل:

```typescript
// في next.config.ts
const nextConfig: NextConfig = {
  output: "standalone",  // يسمح بالنشر المستقل
  ...
}
```

**الفوائد:**

- سهولة النشر على خوادم منفصلة
- عزل كامل عن باقي المنصة
- سهولة التحديث والصيانة

**طريقة الاستخدام:**

```bash
# بناء التطبيق
npm run build

# تشغيل التطبيق
npm start
```

---

### 2. الدمج كمكون React

يمكن استيراد المكونات مباشرة في تطبيق أكبر:

```tsx
// في أي صفحة أو مكون في المنصة الأم
import BudgetApp from "@/path/to/BUDGET/components/BudgetApp";
import { ScriptAnalyzer } from "@/path/to/BUDGET/components/ScriptAnalyzer";

function ParentPage() {
  return (
    <div>
      <h1>منصة الإنتاج السينمائي</h1>

      {/* استخدام تطبيق الميزانية */}
      <BudgetApp />

      {/* أو استخدام مكونات فردية */}
      <ScriptAnalyzer
        analysis={myAnalysis}
        isAnalyzing={false}
        onAnalyze={handleAnalyze}
      />
    </div>
  );
}
```

**الخطوات المطلوبة:**

1. نسخ مجلد `components/` إلى المنصة الأم
2. نسخ `lib/` للوظائف المساعدة
3. دمج `globals.css` في ملف CSS الرئيسي
4. التأكد من توفر المكتبات المطلوبة

---

### 3. الربط عبر API

استخدام API endpoints للتكامل مع أنظمة مختلفة:

#### **A. توليد ميزانية**

```javascript
// من أي تطبيق (React, Vue, Angular, etc.)
const generateBudget = async (filmTitle, scenario) => {
  const response = await fetch("http://localhost:3001/api/budget/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // إضافة authentication headers إذا لزم الأمر
      Authorization: "Bearer YOUR_TOKEN",
    },
    body: JSON.stringify({
      title: filmTitle,
      scenario: scenario,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to generate budget");
  }

  const data = await response.json();
  return data.budget;
};

// مثال على الاستخدام
const budget = await generateBudget("فيلم المطاردة", "سيناريو الفيلم...");
console.log(budget);
```

#### **B. تصدير الميزانية**

```javascript
const exportBudget = async (budget, format = "excel") => {
  const response = await fetch("http://localhost:3001/api/budget/export", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      budget: budget,
      format: format, // 'excel' or 'pdf'
    }),
  });

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `budget.${format === "excel" ? "xlsx" : "pdf"}`;
  a.click();
};
```

---

### 4. الدمج عبر iframe

للدمج السريع بدون تعديلات على الكود:

```html
<!-- في أي صفحة HTML -->
<iframe
  src="http://localhost:3001"
  width="100%"
  height="800px"
  frameborder="0"
  style="border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"
></iframe>
```

**مع تمرير بيانات:**

```javascript
// في الصفحة الأم
const iframe = document.querySelector("iframe");
iframe.contentWindow.postMessage(
  {
    type: "INIT_BUDGET",
    data: {
      title: "عنوان الفيلم",
      scenario: "نص السيناريو...",
    },
  },
  "*"
);

// في التطبيق (app/page.tsx)
useEffect(() => {
  const handleMessage = (event) => {
    if (event.data.type === "INIT_BUDGET") {
      setFilmTitle(event.data.data.title);
      setScenario(event.data.data.scenario);
    }
  };

  window.addEventListener("message", handleMessage);
  return () => window.removeEventListener("message", handleMessage);
}, []);
```

---

### 5. الدمج عبر Microservices

استخدام التطبيق كخدمة مصغرة:

```yaml
# docker-compose.yml
version: "3.8"
services:
  budget-service:
    build: ./BUDGET
    ports:
      - "3001:3000"
    environment:
      - NEXT_PUBLIC_GEMINI_API_KEY=${GEMINI_API_KEY}
      - DATABASE_URL=${DATABASE_URL}
    networks:
      - parent-network

  parent-app:
    build: ./parent-app
    ports:
      - "3000:3000"
    depends_on:
      - budget-service
    networks:
      - parent-network

networks:
  parent-network:
    driver: bridge
```

---

## المتغيرات البيئية المطلوبة

### في التطبيق المستقل:

```env
NEXT_PUBLIC_GEMINI_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
```

### في المنصة الأم:

```env
# إضافة URL للتطبيق
BUDGET_SERVICE_URL=http://localhost:3001

# أو إذا كان مدمجاً
NEXT_PUBLIC_GEMINI_API_KEY=your_key_here
```

---

## حماية API Endpoints

لحماية API endpoints في بيئة الإنتاج:

```typescript
// في app/api/budget/generate/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // التحقق من التوكن
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.substring(7);

  // التحقق من صحة التوكن
  if (!isValidToken(token)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  // باقي الكود...
}
```

---

## مثال شامل للدمج

```typescript
// في المنصة الأم
import { useState } from 'react';

function FilmProductionPlatform() {
  const [budgetData, setBudgetData] = useState(null);

  const handleGenerateBudget = async (title, scenario) => {
    try {
      const response = await fetch(
        process.env.BUDGET_SERVICE_URL + '/api/budget/generate',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
          },
          body: JSON.stringify({ title, scenario })
        }
      );

      const { budget } = await response.json();
      setBudgetData(budget);

      // حفظ في قاعدة البيانات
      await saveToDatabase(budget);

    } catch (error) {
      console.error('Budget generation failed:', error);
    }
  };

  return (
    <div>
      {/* واجهة المنصة الأم */}
      <MainPlatformUI onGenerateBudget={handleGenerateBudget} />

      {/* عرض البيانات */}
      {budgetData && <BudgetDisplay data={budgetData} />}
    </div>
  );
}
```

---

## الاختبار

### اختبار API:

```bash
# استخدام curl
curl -X POST http://localhost:3001/api/budget/generate \
  -H "Content-Type: application/json" \
  -d '{
    "title": "فيلم تجريبي",
    "scenario": "مشهد اختباري..."
  }'
```

### اختبار المكونات:

```typescript
// في ملف اختبار
import { render, screen } from '@testing-library/react';
import BudgetApp from '@/components/BudgetApp';

test('renders budget app', () => {
  render(<BudgetApp />);
  expect(screen.getByText(/FilmBudget AI Pro/i)).toBeInTheDocument();
});
```

---

## الأمان والأداء

### توصيات الأمان:

1. استخدام HTTPS في الإنتاج
2. تفعيل CORS بشكل صحيح
3. إضافة Rate Limiting
4. تشفير API Keys
5. استخدام JWT للمصادقة

### تحسين الأداء:

1. استخدام CDN للملفات الثابتة
2. تفعيل Caching
3. ضغط الاستجابات
4. استخدام Server-Side Rendering حسب الحاجة

---

## الدعم الفني

للمساعدة في الدمج، راجع:

- [README.md](./README.md) - دليل المستخدم الأساسي
- [package.json](./package.json) - قائمة المكتبات
- [API Documentation](#) - توثيق API (قيد الإنشاء)

---

© 2026 FilmBudget AI Pro - دليل الدمج والربط بالمنصة الأم
