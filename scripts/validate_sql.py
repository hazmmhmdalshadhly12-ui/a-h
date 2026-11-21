#!/usr/bin/env python3
"""التحقق من صحة صياغة SQL لكل ملفات migrations باستخدام محلل PostgreSQL حقيقي (pglast).

الاستخدام: python3 scripts/validate_sql.py
يرجع exit code غير صفري إذا وجد أي خطأ صياغة.
"""
import sys
from pathlib import Path

import pglast
from pglast import parser

REPO = Path(__file__).resolve().parent.parent
CANDIDATES = [REPO / "vision-academy", REPO]
MIGRATIONS = next((c / "supabase" / "migrations" for c in CANDIDATES if (c / "supabase" / "migrations").is_dir()), None)
if MIGRATIONS is None:
    print("لم يتم العثور على مجلد supabase/migrations")
    sys.exit(1)


def validate_file(path: Path) -> list[str]:
    errors = []
    sql = path.read_text(encoding="utf-8")
    try:
        parser.parse_sql(sql)
    except pglast.parser.ParseError as exc:
        errors.append(f"ParseError: {exc}")
    except Exception as exc:  # noqa: BLE001
        errors.append(f"{type(exc).__name__}: {exc}")
    return errors


def main() -> int:
    files = sorted(MIGRATIONS.glob("*.sql"))
    if not files:
        print("لا توجد ملفات migrations!")
        return 1
    failed = 0
    for f in files:
        errs = validate_file(f)
        if errs:
            failed += 1
            print(f"FAIL {f.name}")
            for e in errs:
                print(f"     {e}")
        else:
            print(f"OK   {f.name}")
    print(f"\n{len(files) - failed}/{len(files)} ملف صياغته سليمة")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
