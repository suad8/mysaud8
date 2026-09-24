#!/usr/bin/env bash
# استعادة نسخة احتياطية أُخذت بـ db-backup.sh.
#
#   RESTORE_DATABASE_URL='<رابط قاعدة الهدف>' npm run db:restore -- backups/db-XXXX.dump
#
# جرّب الاستعادة أولاً على قاعدة مؤقتة/فارغة وتحقق من الأعداد قبل أي استعادة للإنتاج.
# ⚠️ الاستعادة تستبدل الجداول الموجودة في قاعدة الهدف (--clean).
set -euo pipefail

# pg_dump/psql لا تقبل معاملات خاصة بـ Prisma في الرابط (مثل ?schema=public)
pg_url() {
  node -e 'const u = new URL(process.argv[1]); for (const k of ["schema", "connection_limit", "pool_timeout", "pgbouncer", "socket_timeout", "statement_cache_size"]) u.searchParams.delete(k); console.log(u.toString());' "$1"
}

DUMP="${1:?مرّر مسار ملف النسخة (.dump)}"
: "${RESTORE_DATABASE_URL:?ضع RESTORE_DATABASE_URL لقاعدة الهدف (متغير منفصل عمداً عن DATABASE_URL)}"

HOST="$(node -e 'try{console.log(new URL(process.argv[1]).hostname)}catch{console.log("")}' "$RESTORE_DATABASE_URL")"
case "$HOST" in
  localhost|127.0.0.1|::1) ;;
  *)
    if [ "${CONFIRM_DESTRUCTIVE:-}" != "yes" ]; then
      echo "⛔ قاعدة الهدف ليست محلية — الاستعادة ستستبدل بياناتها. أعد التشغيل مع CONFIRM_DESTRUCTIVE=yes إن كنت متأكداً." >&2
      exit 1
    fi
    ;;
esac

TARGET="$(pg_url "$RESTORE_DATABASE_URL")"
pg_restore --clean --if-exists --no-owner --no-privileges --exit-on-error --single-transaction \
  --dbname="$TARGET" "$DUMP"
echo "✓ تمت الاستعادة من $DUMP"

psql "$TARGET" -X -A -t -c "
  SELECT 'AdminUser', count(*) FROM \"AdminUser\" UNION ALL
  SELECT 'Product', count(*) FROM \"Product\" UNION ALL
  SELECT 'Order', count(*) FROM \"Order\" UNION ALL
  SELECT 'Customer', count(*) FROM \"Customer\" UNION ALL
  SELECT 'Setting', count(*) FROM \"Setting\";" | sed 's/|/: /'
