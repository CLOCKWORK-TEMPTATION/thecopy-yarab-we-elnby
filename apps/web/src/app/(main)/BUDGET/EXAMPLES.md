# 🔧 أمثلة عملية للاستخدام والدمج

## FilmBudget AI Pro - Practical Examples

---

## 📋 جدول المحتويات

1. [الاستخدام الأساسي](#الاستخدام-الأساسي)
2. [الدمج مع React](#الدمج-مع-react)
3. [الدمج عبر API](#الدمج-عبر-api)
4. [أمثلة متقدمة](#أمثلة-متقدمة)
5. [التخصيص والتعديل](#التخصيص-والتعديل)

---

## 🚀 الاستخدام الأساسي

### مثال 1: تشغيل التطبيق مباشرة

```bash
# 1. الانتقال للمجلد
cd "D:\New folder (58)\the...copy\frontend\src\app\(main)\BUDGET"

# 2. إضافة API Key في .env.local
echo "NEXT_PUBLIC_GEMINI_API_KEY=YOUR_KEY" >> .env.local

# 3. تشغيل التطبيق
npm run dev

# 4. فتح المتصفح
# http://localhost:3001
```

---

### مثال 2: إنشاء ميزانية من واجهة المستخدم

```typescript
// المستخدم يدخل البيانات التالية:

const filmData = {
  title: "رحلة في الصحراء",
  scenario: `
    فيلم وثائقي مدته 90 دقيقة
    
    المواقع:
    - صحراء سيناء (5 أيام)
    - واحة سيوة (3 أيام)
    
    الطاقم:
    - مخرج واحد
    - مصور رئيسي
    - مصور مساعد
    - مهندس صوت
    
    المعدات:
    - كاميرا RED
    - درون للتصوير الجوي
    - معدات صوت احترافية
    
    الميزانية التقديرية: 50,000 دولار
  `,
};

// النتيجة: ميزانية مفصلة مع جميع الأقسام
```

---

## ⚛️ الدمج مع React

### مثال 3: استخدام كمكون في تطبيق React

```typescript
// في app/production/budget/page.tsx
'use client';

import { useState } from 'react';
import BudgetApp from '@/(main)/BUDGET/components/BudgetApp';
import { Budget } from '@/(main)/BUDGET/lib/types';

export default function ProductionBudgetPage() {
  const [currentBudget, setCurrentBudget] = useState<Budget | null>(null);
  const [savedBudgets, setSavedBudgets] = useState<Budget[]>([]);

  const handleBudgetSave = (budget: Budget) => {
    // حفظ في قاعدة البيانات
    fetch('/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(budget)
    }).then(() => {
      setSavedBudgets([...savedBudgets, budget]);
    });
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">إدارة الميزانيات</h1>

      {/* عرض قائمة الميزانيات المحفوظة */}
      <div className="mb-6">
        <h2 className="text-xl mb-4">الميزانيات المحفوظة</h2>
        <div className="grid grid-cols-3 gap-4">
          {savedBudgets.map((budget, idx) => (
            <div key={idx} className="p-4 border rounded">
              <h3>{budget.metadata?.title}</h3>
              <p>${budget.grandTotal.toLocaleString()}</p>
              <button onClick={() => setCurrentBudget(budget)}>
                عرض
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* تطبيق الميزانية */}
      <BudgetApp
        initialBudget={currentBudget}
        onSave={handleBudgetSave}
      />
    </div>
  );
}
```

---

### مثال 4: استخدام مكونات فردية

```typescript
// استخدام ScriptAnalyzer فقط
import { ScriptAnalyzer } from '@/BUDGET/components/ScriptAnalyzer';
import { useState } from 'react';

function MyAnalysisPage() {
  const [analysis, setAnalysis] = useState(null);

  const handleAnalyze = async () => {
    const result = await fetch('/api/analyze-script', {
      method: 'POST',
      body: JSON.stringify({ script: myScript })
    }).then(r => r.json());

    setAnalysis(result);
  };

  return (
    <ScriptAnalyzer
      analysis={analysis}
      isAnalyzing={false}
      onAnalyze={handleAnalyze}
    />
  );
}
```

---

## 🔌 الدمج عبر API

### مثال 5: استدعاء API من JavaScript العادي

```javascript
// من أي صفحة HTML أو تطبيق
async function generateFilmBudget() {
  const filmData = {
    title: document.getElementById("title").value,
    scenario: document.getElementById("scenario").value,
  };

  try {
    const response = await fetch("http://localhost:3001/api/budget/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(filmData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    displayBudget(data.budget);
  } catch (error) {
    console.error("Error:", error);
    alert("فشل إنشاء الميزانية: " + error.message);
  }
}

function displayBudget(budget) {
  console.log("عنوان المشروع:", budget.metadata?.title);
  console.log("الإجمالي:", budget.grandTotal);
  console.log("الأقسام:", budget.sections.length);

  // عرض في الصفحة
  document.getElementById("result").innerHTML = `
    <h2>${budget.metadata?.title}</h2>
    <p>الميزانية الكلية: $${budget.grandTotal.toLocaleString()}</p>
    <div class="sections">
      ${budget.sections
        .map(
          (section) => `
        <div class="section">
          <h3>${section.name}</h3>
          <p>$${section.total.toLocaleString()}</p>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}
```

---

### مثال 6: استدعاء من Vue.js

```javascript
// في Vue component
export default {
  data() {
    return {
      filmTitle: "",
      scenario: "",
      budget: null,
      loading: false,
    };
  },

  methods: {
    async generateBudget() {
      this.loading = true;

      try {
        const response = await fetch(
          "http://localhost:3001/api/budget/generate",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: this.filmTitle,
              scenario: this.scenario,
            }),
          }
        );

        const data = await response.json();
        this.budget = data.budget;
      } catch (error) {
        console.error(error);
        this.$toast.error("فشل في إنشاء الميزانية");
      } finally {
        this.loading = false;
      }
    },
  },
};
```

---

### مثال 7: استدعاء من Angular

```typescript
// في Angular service
import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

interface Budget {
  grandTotal: number;
  sections: any[];
  metadata?: {
    title?: string;
  };
}

@Injectable({
  providedIn: "root",
})
export class BudgetService {
  private apiUrl = "http://localhost:3001/api/budget";

  constructor(private http: HttpClient) {}

  generateBudget(
    title: string,
    scenario: string
  ): Observable<{ budget: Budget }> {
    return this.http.post<{ budget: Budget }>(`${this.apiUrl}/generate`, {
      title,
      scenario,
    });
  }

  exportBudget(budget: Budget, format: "excel" | "pdf"): Observable<Blob> {
    return this.http.post(
      `${this.apiUrl}/export`,
      { budget, format },
      { responseType: "blob" }
    );
  }
}

// في component
export class BudgetComponent {
  constructor(private budgetService: BudgetService) {}

  generateBudget() {
    this.budgetService.generateBudget(this.title, this.scenario).subscribe({
      next: (data) => {
        this.budget = data.budget;
        console.log("تم إنشاء الميزانية:", data.budget);
      },
      error: (error) => {
        console.error("خطأ:", error);
      },
    });
  }
}
```

---

## 🎨 أمثلة متقدمة

### مثال 8: دمج مع NextAuth للمصادقة

```typescript
// في app/api/budget/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { geminiService } from "@/lib/geminiService";

export async function POST(request: NextRequest) {
  // التحقق من المصادقة
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json(
      { error: "يجب تسجيل الدخول أولاً" },
      { status: 401 }
    );
  }

  try {
    const { scenario, title } = await request.json();

    // توليد الميزانية
    const budget = await geminiService.generateBudgetFromScript(
      scenario,
      template
    );

    // حفظ في قاعدة البيانات مع معرف المستخدم
    await prisma.budget.create({
      data: {
        title: budget.metadata?.title,
        data: budget,
        userId: session.user.id,
        grandTotal: budget.grandTotal,
      },
    });

    return NextResponse.json({ budget });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

### مثال 9: حفظ في قاعدة البيانات

```typescript
// schema.prisma
model Budget {
  id          String   @id @default(cuid())
  title       String
  data        Json     // البيانات الكاملة للميزانية
  grandTotal  Float
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId])
  @@map("budgets")
}

// في الكود
import { prisma } from '@/lib/prisma';

async function saveBudget(budget: Budget, userId: string) {
  const saved = await prisma.budget.create({
    data: {
      title: budget.metadata?.title || 'Untitled',
      data: budget,
      grandTotal: budget.grandTotal,
      userId: userId
    }
  });

  return saved;
}

async function getUserBudgets(userId: string) {
  const budgets = await prisma.budget.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });

  return budgets;
}
```

---

### مثال 10: إضافة تصدير PDF مخصص

```typescript
// في lib/exportService.ts
import jsPDF from "jspdf";
import { Budget } from "./types";

export function exportToPDF(budget: Budget): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // إضافة خط عربي
  doc.addFont("path/to/arabic-font.ttf", "Arabic", "normal");
  doc.setFont("Arabic");

  // الترويسة
  doc.setFontSize(20);
  doc.text(budget.metadata?.title || "ميزانية الإنتاج", 105, 20, {
    align: "center",
  });

  // الإجمالي
  doc.setFontSize(16);
  doc.text(`الإجمالي الكلي: $${budget.grandTotal.toLocaleString()}`, 20, 40);

  // الأقسام
  let y = 60;
  budget.sections.forEach((section) => {
    doc.setFontSize(14);
    doc.text(section.name, 20, y);
    doc.text(`$${section.total.toLocaleString()}`, 150, y);
    y += 10;

    // الفئات
    section.categories.forEach((category) => {
      doc.setFontSize(10);
      doc.text(`  ${category.name}`, 25, y);
      doc.text(`$${category.total.toLocaleString()}`, 150, y);
      y += 7;

      if (y > 280) {
        doc.addPage();
        y = 20;
      }
    });

    y += 5;
  });

  // حفظ الملف
  doc.save(`${budget.metadata?.title || "budget"}.pdf`);
}
```

---

## 🎯 التخصيص والتعديل

### مثال 11: إضافة قالب ميزانية مخصص

```typescript
// في lib/constants.ts
export const CUSTOM_TEMPLATE: Budget = {
  currency: "USD",
  grandTotal: 0,
  metadata: {
    title: "ميزانية مسلسل تلفزيوني",
    genre: "دراما",
  },
  sections: [
    {
      id: "pre-production",
      name: "ما قبل الإنتاج",
      total: 0,
      color: "#3B82F6",
      categories: [
        {
          code: "SCRIPT",
          name: "السيناريو والحقوق",
          total: 0,
          items: [
            {
              code: "SCRIPT-01",
              description: "كتابة السيناريو",
              amount: 1,
              unit: "عقد",
              rate: 50000,
              total: 50000,
            },
            {
              code: "SCRIPT-02",
              description: "شراء حقوق القصة",
              amount: 1,
              unit: "عقد",
              rate: 100000,
              total: 100000,
            },
          ],
        },
      ],
    },
  ],
};

// استخدام القالب
function useCustomTemplate() {
  const [budget, setBudget] = useState(CUSTOM_TEMPLATE);
  return budget;
}
```

---

### مثال 12: إضافة webhook للإشعارات

```typescript
// في app/api/budget/generate/route.ts
export async function POST(request: NextRequest) {
  // ... توليد الميزانية

  const budget = await geminiService.generateBudgetFromScript(
    scenario,
    template
  );

  // إرسال webhook
  try {
    await fetch("https://your-webhook-url.com/budget-created", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "budget_created",
        data: {
          title: budget.metadata?.title,
          total: budget.grandTotal,
          userId: session?.user?.id,
          timestamp: new Date().toISOString(),
        },
      }),
    });
  } catch (webhookError) {
    console.error("Webhook failed:", webhookError);
    // لا نوقف العملية إذا فشل الـ webhook
  }

  return NextResponse.json({ budget });
}
```

---

### مثال 13: إضافة تتبع Analytics

```typescript
// في components/BudgetApp.tsx
import { useEffect } from "react";

function trackBudgetGeneration(budget: Budget) {
  // Google Analytics
  if (typeof window.gtag !== "undefined") {
    window.gtag("event", "budget_generated", {
      budget_total: budget.grandTotal,
      sections_count: budget.sections.length,
      genre: budget.metadata?.genre,
    });
  }

  // Custom Analytics API
  fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: "budget_generated",
      properties: {
        total: budget.grandTotal,
        sections: budget.sections.length,
        timestamp: Date.now(),
      },
    }),
  });
}

// في المكون
useEffect(() => {
  if (budget && budget.grandTotal > 0) {
    trackBudgetGeneration(budget);
  }
}, [budget]);
```

---

## 🧪 اختبارات عملية

### مثال 14: اختبار الوحدات (Unit Tests)

```typescript
// في __tests__/budgetApp.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BudgetApp from '@/components/BudgetApp';
import { geminiService } from '@/lib/geminiService';

// Mock الخدمة
jest.mock('@/lib/geminiService');

describe('BudgetApp', () => {
  it('should generate budget when script is provided', async () => {
    const mockBudget = {
      grandTotal: 100000,
      sections: [],
      currency: 'USD'
    };

    (geminiService.generateBudgetFromScript as jest.Mock)
      .mockResolvedValue(mockBudget);

    render(<BudgetApp />);

    // إدخال نص
    const textarea = screen.getByPlaceholderText(/أدخل السيناريو/i);
    fireEvent.change(textarea, {
      target: { value: 'مشهد اختباري' }
    });

    // النقر على زر التوليد
    const generateBtn = screen.getByText(/إنشاء الميزانية/i);
    fireEvent.click(generateBtn);

    // انتظار النتيجة
    await waitFor(() => {
      expect(screen.getByText(/\$100,000/i)).toBeInTheDocument();
    });
  });
});
```

---

### مثال 15: اختبار API

```typescript
// في __tests__/api/budget.test.ts
import { POST } from "@/app/api/budget/generate/route";
import { NextRequest } from "next/server";

describe("Budget API", () => {
  it("should return 400 if no scenario provided", async () => {
    const request = new NextRequest(
      "http://localhost:3001/api/budget/generate",
      {
        method: "POST",
        body: JSON.stringify({ title: "Test" }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it("should generate budget successfully", async () => {
    const request = new NextRequest(
      "http://localhost:3001/api/budget/generate",
      {
        method: "POST",
        body: JSON.stringify({
          title: "Test Film",
          scenario: "Test scenario content...",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.budget).toBeDefined();
    expect(data.budget.grandTotal).toBeGreaterThan(0);
  });
});
```

---

## 📊 خلاصة الأمثلة

تم تقديم **15 مثال عملي** تغطي:

✅ الاستخدام الأساسي  
✅ الدمج مع React/Vue/Angular  
✅ استخدام APIs  
✅ المصادقة والحماية  
✅ قاعدة البيانات  
✅ التصدير المخصص  
✅ القوالب المخصصة  
✅ Webhooks  
✅ Analytics  
✅ الاختبارات

---

**جميع الأمثلة جاهزة للاستخدام والتعديل حسب احتياجاتك!**

© 2026 FilmBudget AI Pro
