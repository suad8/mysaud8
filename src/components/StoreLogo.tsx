import Image from "next/image";

/** شعار المتجر: يعرض الصورة المرفوعة إن وُجدت، وإلا شارة الحرف الأول من الاسم. */
export function StoreLogo({
  name,
  logoUrl,
  size = 36,
  className,
}: {
  name: string;
  logoUrl: string;
  size?: number;
  className?: string;
}) {
  if (logoUrl) {
    return (
      <span
        className={`relative shrink-0 overflow-hidden rounded-2xl bg-white ${className ?? ""}`}
        style={{ width: size, height: size }}
      >
        <Image src={logoUrl} alt={name} fill sizes={`${size}px`} className="object-contain p-1" />
      </span>
    );
  }
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-2xl bg-brand-700 font-bold text-white ${className ?? ""}`}
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {name.slice(0, 1)}
    </span>
  );
}
