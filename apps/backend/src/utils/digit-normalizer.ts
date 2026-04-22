/**
 * @description تطبيع الأرقام العربية والغربية
 * @module digit-normalizer
 */

/** نمط مطابقة الأرقام الغربية (0-9) */
export const toArabicDigitRegex = /[0-9]/g;

/** نمط مطابقة الأرقام العربية (٠-٩) */
export const toWesternDigitRegex = /[٠-٩]/g;

/** خريطة تحويل الأرقام الغربية إلى عربية */
export const westernToArabicDigitMap: Record<string, string> = {
  "0": "٠",
  "1": "١",
  "2": "٢",
  "3": "٣",
  "4": "٤",
  "5": "٥",
  "6": "٦",
  "7": "٧",
  "8": "٨",
  "9": "٩",
};

/** خريطة تحويل الأرقام العربية إلى غربية */
export const arabicToWesternDigitMap: Record<string, string> = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};
