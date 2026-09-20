/**
 * منطق مطابقة المدينة بمنطقة شحن — بلا أي استيراد لقاعدة البيانات عمداً،
 * لأنه يُستورَد أيضاً داخل مكوّن عميل (CheckoutForm) لحساب الشحن تفاعلياً
 * أثناء الكتابة دون طلب شبكة إضافي. استيراد db هنا يكسر حزمة العميل.
 */

export type ShippingRateOption = {
  id: string;
  nameAr: string;
  price: number;
  freeAbove: number | null;
  minDays: number | null;
  maxDays: number | null;
};

export type ShippingZoneWithRates = {
  id: string;
  nameAr: string;
  cities: string[];
  rates: ShippingRateOption[];
};

/** يوحّد اختلافات الهمزة/التاء المربوطة والمسافات الزائدة لمطابقة أكثر تسامحاً لاسم المدينة. */
function normalizeCity(city: string): string {
  return city
    .trim()
    .replace(/[إأآا]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** يطابق مدينة العميل مع أقرب منطقة شحن، وإلا يعود لأول منطقة فعّالة كافتراضي معقول. */
export function matchZoneForCity(zones: ShippingZoneWithRates[], city: string): ShippingZoneWithRates | null {
  if (zones.length === 0) return null;
  const normalized = normalizeCity(city);
  const matched = zones.find((z) => z.cities.some((c) => normalizeCity(c) === normalized));
  return matched ?? zones[0];
}
