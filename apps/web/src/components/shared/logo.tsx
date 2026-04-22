import Link from "next/link";

export function Logo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2"
      aria-label="العودة للصفحة الرئيسية"
    >
      <span className="font-headline text-2xl font-bold text-primary">
        النسخة
      </span>
    </Link>
  );
}
