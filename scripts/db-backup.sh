#!/usr/bin/env bash
# نسخة احتياطية كاملة لقاعدة البيانات (+ ملفات الرفع إن وُجدت محلياً).
#
#   DATABASE_URL='<رابط القاعدة>' npm run db:backup
#
# للإنتاج: استخدم DATABASE_PUBLIC_URL من خدمة Postgres في Railway (تبويب Variables)
# من جهازك — لا تنسخ الرابط في أي مكان عام. الملفات تُحفظ في backups/ (مستثنى من git)
# وتحتوي بيانات عملاء: احفظها في مكان خاص ومشفّر.
set -euo pipefail

# pg_dump/psql لا تقبل معاملات خاصة بـ Prisma في الرابط (مثل ?schema=public)
pg_url() {
  node -e 'const u = new URL(process.argv[1]); for (const k of ["schema", "connection_limit", "pool_timeout", "pgbouncer", "socket_timeout", "statement_cache_size"]) u.searchParams.delete(k); console.log(u.toString());' "$1"
}

: "${DATABASE_URL:?ضع DATABASE_URL لقاعدة البيانات المراد نسخها}"
OUT_DIR="${BACKUP_DIR:-backups}"
TS="$(date -u +%Y%m%d-%H%M%S)"

umask 077
mkdir -p "$OUT_DIR"

DB_FILE="$OUT_DIR/db-$TS.dump"
# صيغة custom مضغوطة — تُستعاد بـ pg_restore، بلا مالك/صلاحيات لتعمل على أي خادم
pg_dump --format=custom --no-owner --no-privileges --dbname="$(pg_url "$DATABASE_URL")" --file="$DB_FILE"
pg_restore --list "$DB_FILE" > /dev/null # تحقق أن الملف سليم وقابل للقراءة
echo "✓ قاعدة البيانات: $DB_FILE ($(du -h "$DB_FILE" | cut -f1))"

if [ -d public/uploads ] && [ -n "$(find public/uploads -type f ! -name .gitkeep -print -quit)" ]; then
  UP_FILE="$OUT_DIR/uploads-$TS.tar.gz"
  tar -czf "$UP_FILE" -C public uploads
  echo "✓ ملفات الرفع: $UP_FILE ($(du -h "$UP_FILE" | cut -f1))"
fi
