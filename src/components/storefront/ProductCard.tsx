import Image from "next/image";
import Link from "next/link";
import { Price } from "@/components/ui/Price";
import { Badge } from "@/components/ui/Badge";
import { Rating } from "@/components/ui/Rating";

export type ProductCardData = {
  slug: string;
  nameAr: string;
  shortDescAr: string | null;
  imageUrl: string;
  price: number;
  comparePrice: number | null;
  rating: number;
  reviewCount: number;
  /** الكمية المتاحة عبر كل المتغيّرات — تحدّد شارة التوفر */
  available: number;
};

export function ProductCard({ product }: { product: ProductCardData }) {
  const soldOut = product.available <= 0;
  const lowStock = !soldOut && product.available <= 5;

  return (
    <Link
      href={`/p/${product.slug}`}
      className="group surface-card flex flex-col overflow-hidden transition-shadow hover:shadow-[var(--shadow-lift)]"
    >
      <div className="relative aspect-square overflow-hidden bg-[var(--surface-sunken)]">
        <Image
          src={product.imageUrl}
          alt={product.nameAr}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-3 start-3 flex flex-col gap-1.5">
          {soldOut && <Badge tone="gray">نفد المخزون</Badge>}
          {lowStock && <Badge tone="amber">بقي {product.available}</Badge>}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{product.nameAr}</h3>
        {product.shortDescAr && (
          <p className="line-clamp-1 text-xs text-muted">{product.shortDescAr}</p>
        )}
        <Rating value={product.rating} count={product.reviewCount} />
        <div className="mt-auto pt-2">
          <Price value={product.price} compareAt={product.comparePrice} />
        </div>
      </div>
    </Link>
  );
}
