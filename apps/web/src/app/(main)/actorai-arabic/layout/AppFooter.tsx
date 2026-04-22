"use client";

/**
 * الصفحة: actorai-arabic / AppFooter
 * الهوية: تذييل داخلي بطابع تقني/أدائي متسق مع القشرة الموحدة
 * المتغيرات الخاصة المضافة: تعتمد على متغيرات ActorAiArabicStudioV2 المحقونة أعلى الشجرة
 * مكونات Aceternity المستخدمة: CardSpotlight
 */

import { CardSpotlight } from "@/components/aceternity/card-spotlight";

export function AppFooter() {
  return (
    <footer className="mt-10 px-4 pb-4 md:px-6 md:pb-6">
      <CardSpotlight className="overflow-hidden rounded-[26px] border border-white/8 bg-black/22 p-6 backdrop-blur-2xl md:p-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4 text-right text-white">
          <div>
            <h3 className="text-xl font-bold mb-4 flex items-center justify-end gap-2">
              <span>الممثل الذكي</span>
              <span>🎭</span>
            </h3>
            <p className="text-white/55 leading-7">
              منصة تدريب الممثلين بالذكاء الاصطناعي داخل هوية بصرية موحدة مع
              المنصة.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">المنتج</h4>
            <ul className="space-y-2 text-white/55">
              <li className="hover:text-white cursor-pointer">التجربة</li>
              <li className="hover:text-white cursor-pointer">الميزات</li>
              <li className="hover:text-white cursor-pointer">الأسعار</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">الموارد</h4>
            <ul className="space-y-2 text-white/55">
              <li className="hover:text-white cursor-pointer">المدونة</li>
              <li className="hover:text-white cursor-pointer">الدروس</li>
              <li className="hover:text-white cursor-pointer">الدعم</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">تواصل معنا</h4>
            <p className="text-white/55">© 2025 الممثل الذكي</p>
          </div>
        </div>
      </CardSpotlight>
    </footer>
  );
}
