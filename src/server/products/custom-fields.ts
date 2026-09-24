/** أنواع الحقول المخصّصة القابلة للإضافة لأي منتج — يملؤها العميل عند الشراء. */
export type CustomFieldType = "TEXT" | "TEXTAREA" | "FILE";

export type CustomFieldDef = {
  id: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
};

export type CustomFieldValue = {
  label: string;
  type: CustomFieldType;
  /** نص للحقول النصية، أو رابط الملف المرفوع لحقول الملف/الصورة */
  value: string;
};

export const CUSTOM_FIELD_TYPE_LABEL: Record<CustomFieldType, string> = {
  TEXT: "نص قصير",
  TEXTAREA: "نص طويل",
  FILE: "ملف أو صورة",
};

export function parseCustomFieldDefs(value: unknown): CustomFieldDef[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is CustomFieldDef =>
      v && typeof v === "object" && typeof v.id === "string" && typeof v.label === "string" && typeof v.type === "string" && typeof v.required === "boolean",
  );
}

export function parseCustomFieldValues(value: unknown): CustomFieldValue[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is CustomFieldValue => v && typeof v === "object" && typeof v.label === "string" && typeof v.type === "string" && typeof v.value === "string",
  );
}
