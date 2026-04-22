"use client";

import { ImageWithFallback } from "@/components/ui/image-with-fallback";

// مثال لاستخدام ImageWithFallback
export default function ImageExample() {
  return (
    <div className="p-8 space-y-4">
      <h2 className="text-2xl font-bold mb-4">أمثلة ImageWithFallback</h2>

      <div className="space-y-8">
        {/* مثال 1: صورة عادية */}
        <div>
          <h3 className="text-lg font-semibold mb-2">صورة عادية</h3>
          <ImageWithFallback
            src="/images/working-image.jpg"
            alt="صورة عادية"
            width={300}
            height={200}
            className="border rounded"
          />
        </div>

        {/* مثال 2: صورة مع fallback مخصص */}
        <div>
          <h3 className="text-lg font-semibold mb-2">صورة مع fallback مخصص</h3>
          <ImageWithFallback
            src="/images/non-existent-image.jpg"
            fallbackSrc="/images/fallback.jpg"
            alt="صورة مع fallback"
            width={300}
            height={200}
            className="border rounded"
          />
        </div>

        {/* مثال 3: صورة من مصدر خارجي */}
        <div>
          <h3 className="text-lg font-semibold mb-2">صورة من مصدر خارجي</h3>
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400"
            alt="صورة من.unsplash.com"
            width={400}
            height={300}
            className="border rounded"
          />
        </div>
      </div>
    </div>
  );
}
