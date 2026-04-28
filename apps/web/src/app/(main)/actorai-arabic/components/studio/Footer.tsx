import React from "react";

export const Footer: React.FC = () => (
  <footer className="bg-black/14 text-white py-12 mt-16">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            🎭 الممثل الذكي
          </h3>
          <p className="text-white/55">
            منصة تدريب الممثلين بالذكاء الاصطناعي
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
    </div>
  </footer>
);
