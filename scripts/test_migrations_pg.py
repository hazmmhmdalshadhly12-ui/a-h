#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
اختبار 047_exam_access_part1.sql و 047_exam_access_part2.sql + إصلاح 048
على قاعدة PostgreSQL 16 حقيقية (pgserver) ببيانات امتحانات ونتائج قديمة.

المحاكاة:
- schema.sql  = حالة الإنتاج قبل 047 (جداول + دوال + سياسات 010/016/043)
- seed.sql    = امتحانات قديمة + نتائج قديمة بلا question_snapshot
- ثم: part1 → فحوص → part2 → سيناريوهات A-F → القسم H يعيد إنتاج
  مشكلة الإنتاج (امتحان عام مضى على نشره 10 ساعات يظهر «غير متاح»)
  على قاعدة منفصلة بالتعريف القديم، ويطبق 048 ويثبت زوال المشكلة
  وعدم كسر منع التجاوز → القسم G (ترتيب خاطئ)
"""
import json
import sys
import traceback
from datetime import datetime, timedelta, timezone
from pathlib import Path

import psycopg
import pgserver

BASE = Path('/home/z/my-project/vision-academy')
SCHEMA = (Path('/home/z/my-project/scripts/testdb/schema.sql')).read_text(encoding='utf-8')
SEED = (Path('/home/z/my-project/scripts/testdb/seed.sql')).read_text(encoding='utf-8')
PART1 = (BASE / 'supabase/migrations/047_exam_access_part1.sql').read_text(encoding='utf-8')
PART2 = (BASE / 'supabase/migrations/047_exam_access_part2.sql').read_text(encoding='utf-8')
HOTFIX = (BASE / 'supabase/migrations/048_exam_window_fix.sql').read_text(encoding='utf-8')

# تعريف exam_attempt_deadline كما كان قبل إصلاح 048 (حالة قاعدة الإنتاج
# الحالية) — يستخدمه القسم H لمحاكاة الإنتاج وإثبات أن 048 يحل المشكلة
OLD_DEADLINE = """
create or replace function public.exam_attempt_deadline(p_exam public.exams, p_attempt_started timestamptz)
returns timestamptz
language sql stable
as $$
  select least(
    coalesce(p_exam.end_at, 'infinity'::timestamptz),
    case
      when p_exam.duration_minutes is not null and p_exam.duration_minutes > 0
           and p_exam.start_at is not null
        then p_exam.start_at + make_interval(mins => p_exam.duration_minutes) + interval '60 seconds'
      else 'infinity'::timestamptz
    end,
    case
      when p_exam.duration_minutes is not null and p_exam.duration_minutes > 0
           and p_attempt_started is not null
        then p_attempt_started + make_interval(mins => p_exam.duration_minutes) + interval '60 seconds'
      else 'infinity'::timestamptz
    end
  );
$$;
"""

# ---- معرفات ثابتة ----
ADMIN = '00000000-0000-4000-8000-00000000ad01'
A = '00000000-0000-4000-8000-00000000a101'   # مشترك شهري — صف أول
B = '00000000-0000-4000-8000-00000000b201'   # غير مشترك — صف أول
C = '00000000-0000-4000-8000-00000000c301'   # مشترك — صف ثانٍ
D = '00000000-0000-4000-8000-00000000d401'   # مشترك بكورس — صف أول
E = '00000000-0000-4000-8000-00000000e501'   # غير مشترك — صف أول
E1 = '11111111-1111-4111-8111-111111111111'  # امتحان قديم (صف أول)
E2 = '22222222-2222-4222-8222-222222222222'  # امتحان قديم (صف ثانٍ)
E3 = '33333333-3333-4333-8333-333333333333'  # بلا نتائج (يُحذف في A8)
E7_ = '44444444-4444-4444-8444-444444444444'  # امتحان غير منشور للفحص
Q1 = '11111111-1111-4111-8111-000000000001'
Q2 = '11111111-1111-4111-8111-000000000002'
Q3 = '11111111-1111-4111-8111-000000000003'
S1 = '11111111-1111-4111-8111-a00000000001'

PASS = 0
FAIL = 0


def check(name, cond, detail=''):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f'  PASS  {name}')
    else:
        FAIL += 1
        print(f'  FAIL  {name}   << {detail}')


def fresh_db(admin_conn, name):
    admin_conn.execute(f'drop database if exists {name}')
    admin_conn.execute(f'create database {name}')


def main():
    global PASS, FAIL
    db = pgserver.get_server('/tmp/vision_pgdata')
    uri = db.get_uri()

    admin_conn = psycopg.connect(uri, autocommit=True)
    fresh_db(admin_conn, 'vision_test')
    conn = psycopg.connect(uri, dbname='vision_test', autocommit=True)
    cur = conn.cursor()

    def become(uid=None):
        cur.execute('reset role')
        if uid:
            cur.execute("select set_config('app.current_uid', %s, false)", (str(uid),))
            cur.execute('set role authenticated')
        else:
            cur.execute("select set_config('app.current_uid', '', false)")

    def q(sql, params=()):
        cur.execute(sql, params)
        return cur.fetchall() if cur.description else None

    def q1(sql, params=()):
        rows = q(sql, params)
        return rows[0] if rows else None

    def expect_error(name, uid, sql, params, needle):
        become(uid)
        try:
            cur.execute(sql, params)
            got = cur.fetchall() if cur.description else None
            check(name, False, f'لم يُطلق الخطأ المتوقع — النتيجة: {got}')
        except psycopg.Error as exc:
            check(name, needle in str(exc), str(exc).strip()[:140])
        finally:
            become(None)

    # ================= إعداد القاعدة =================
    print('\n=== إعداد القاعدة التجريبية (حالة ما قبل 047) ===')
    cur.execute(SCHEMA)
    cur.execute(SEED)
    check('قاعدة الاختبار جاهزة ببيانات قديمة', True)

    # ================= A) تطبيق الجزء 1 =================
    print('\n=== A) تطبيق 047_exam_access_part1.sql ===')
    try:
        cur.execute(PART1)
        check('A1 تطبيق الجزء 1 نجح', True)
    except Exception as exc:
        check('A1 تطبيق الجزء 1 نجح', False, str(exc)[:300])
        raise SystemExit(1)

    cols = q("select column_name, column_default from information_schema.columns "
             "where table_schema='public' and table_name='exams' and column_name='access_mode'")
    check('A2 عمود access_mode أُضيف بلافتراضي subscribers',
          cols and 'subscribers' in (cols[0][1] or ''), str(cols))
    cons = q("select 1 from pg_constraint where conname='exams_access_mode_check' "
             "and conrelid='public.exams'::regclass")
    check('A3 قيد CHECK exams_access_mode_check موجود', bool(cons))
    modes = q('select access_mode from public.exams order by id')
    check('A4 كل الامتحانات القديمة بقيت subscribers (لا تحويل تلقائي لعام)',
          all(r[0] == 'subscribers' for r in modes), str(modes))

    att = q("select 1 from information_schema.tables where table_schema='public' and table_name='exam_attempts'")
    rls = q("select relrowsecurity from pg_class where relname='exam_attempts'")
    idx = q("select 1 from pg_indexes where schemaname='public' and tablename='exam_attempts' "
            "and indexdef like '%%UNIQUE%%'")
    check('A5 جدول exam_attempts + RLS + قيد فريد (exam_id, student_id)',
          bool(att) and bool(rls and rls[0][0]) and bool(idx))

    snap = q1("select question_snapshot from public.exam_submissions where id=%s", (S1,))
    snapj = snap[0] if snap else None
    ok_snap = (snapj is not None
               and snapj.get('captured_at') is not None
               and isinstance(snapj.get('questions'), list)
               and len(snapj['questions']) == 3
               and all('correct_answer' in qq and 'question_text' in qq for qq in snapj['questions'])
               and snapj['questions'][0]['question_text'] == 'ما وحدة قياس سرعة المعالج؟')
    check('A6 Backfill: النتيجة القديمة S1 اتجمدت أسئلتها الـ3 (مع correct_answer) في الـ Snapshot',
          bool(ok_snap), str(snapj)[:200])
    snap_before_rerun = snapj

    try:
        cur.execute('delete from public.exams where id=%s', (E1,))
        check('A7 حارس الحذف يمنع حذف امتحان له نتائج', False, 'الحذف نجح رغم وجود نتائج!')
    except psycopg.Error as exc:
        check('A7 حارس الحذف يمنع حذف امتحان له نتائج', 'لا يمكن حذف امتحان' in str(exc), str(exc)[:120])
    cur.execute('delete from public.exams where id=%s', (E3,))
    gone = q("select 1 from public.exams where id=%s", (E3,))
    check('A8 حذف امتحان بلا نتائج ما زال ممكنًا', not gone)

    fn_def = q1("select pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace "
                "where n.nspname='public' and p.proname='can_access_exam'")
    check('A9 can_access_exam استُبدلت بالنسخة الجديدة (وفق access_mode)',
          bool(fn_def) and 'access_mode' in fn_def[0] and "'public'" in fn_def[0],
          str(fn_def)[:150] if fn_def else 'غير موجودة')

    pol = q("select policyname from pg_policies where schemaname='public' and tablename='exams' order by 1")
    pols = [r[0] for r in pol]
    check('A10 سياسة exams القديمة (016) استُبدلت بالجديدة',
          'exams: students read accessible' not in pols
          and 'exams: students read published for own grade' in pols
          and 'exams: admin write' in pols, str(pols))

    # ================= B) تطبيق الجزء 2 =================
    print('\n=== B) تطبيق 047_exam_access_part2.sql ===')
    try:
        cur.execute(PART2)
        check('B1 تطبيق الجزء 2 نجح', True)
    except Exception as exc:
        check('B1 تطبيق الجزء 2 نجح', False, str(exc)[:300])
        raise SystemExit(1)

    grants = {}
    for fn in ['can_access_exam(uuid)', 'get_exam_questions(uuid)', 'start_exam_attempt(uuid)',
               'submit_exam(uuid, jsonb)', 'get_my_submission(uuid)', 'save_exam(jsonb)']:
        r = q1(f"select has_function_privilege('authenticated', 'public.{fn}', 'EXECUTE')")
        grants[fn] = bool(r and r[0])
    check('B2 صلاحيات EXECUTE لكل الـ RPC على authenticated', all(grants.values()), str(grants))
    arg_sig = q1("select pg_get_function_arguments(p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace "
                 "where n.nspname='public' and p.proname='get_my_submission'")
    check('B3 get_my_submission موجود بالتوقيع الموسع',
          bool(arg_sig) and 'p_exam_id' in arg_sig[0], str(arg_sig))

    # ================= C) سلامة النتائج القديمة =================
    print('\n=== C) سلامة مراجعة النتائج القديمة (Snapshot) ===')
    become(A)
    row = q1('select * from public.get_my_submission(%s)', (E1,))
    become(None)
    ok_c1 = (row is not None and row[3] is None and row[4] is None and row[5] is None
             and row[6] is False and isinstance(row[8], list) and len(row[8]) == 3
             and row[8][0]['question_text'] == 'ما وحدة قياس سرعة المعالج؟'
             and all('correct_answer' not in qq for qq in row[8]))
    check('C1 مراجعة النتيجة القديمة: نفس الأسئلة الـ3 الأصلية بدون correct_answer + الدرجات مخفية قبل النشر',
          ok_c1, str(row)[:220])

    payload_edit = {
        'id': E1, 'title': 'الامتحان الشهري القديم', 'grade': 'first_secondary',
        'duration_minutes': 30, 'is_published': True, 'access_mode': 'subscribers',
        'questions': [
            {'id': Q1, 'question_text': 'سؤال معدل جديد النص', 'type': 'mcq',
             'options': ["جيجاهرتز", "ميجابايت", "بكسل"], 'correct_answer': 'جيجاهرتز', 'points': 2},
            {'id': Q2, 'question_text': 'الرام تخزن دائم', 'type': 'true_false',
             'options': ["صح", "خطأ"], 'correct_answer': 'خطأ', 'points': 1},
            {'id': Q3, 'question_text': 'اذكر وظيفة نظام التشغيل', 'type': 'short_answer',
             'options': None, 'correct_answer': None, 'points': 3},
        ]}
    become(ADMIN)
    cur.execute('select public.save_exam(%s::jsonb)', (json.dumps(payload_edit, ensure_ascii=False),))
    become(None)
    live_q1 = q1('select question_text from public.exam_questions where id=%s', (Q1,))
    check('C2 تعديل السؤال في جدول الامتحان نجح (النص الجديد)',
          live_q1 and live_q1[0] == 'سؤال معدل جديد النص', str(live_q1))

    become(A)
    row = q1('select review_questions from public.get_my_submission(%s)', (E1,))
    become(None)
    check('C3 بعد تعديل السؤال: مراجعة النتيجة القديمة ما زالت تعرض النص الأصلي (Snapshot)',
          row and row[0][0]['question_text'] == 'ما وحدة قياس سرعة المعالج؟', str(row)[:160])

    payload_del = dict(payload_edit)
    payload_del['questions'] = [payload_edit['questions'][0], payload_edit['questions'][2]]
    become(ADMIN)
    cur.execute('select public.save_exam(%s::jsonb)', (json.dumps(payload_del, ensure_ascii=False),))
    become(None)
    cnt = q1('select count(*) from public.exam_questions where exam_id=%s', (E1,))
    check('C4 حذف السؤال من الامتحان نجح (بقي سؤالان)', cnt[0] == 2, str(cnt))
    become(A)
    row = q1('select review_questions from public.get_my_submission(%s)', (E1,))
    become(None)
    check('C5 بعد حذف السؤال: مراجعة النتيجة القديمة ما زالت تعرض الأسئلة الـ3 كاملة',
          row and len(row[0]) == 3 and any(qq['id'] == Q2 for qq in row[0]), str(row)[:160])

    # طالب جديد يحل E1 بعد التعديل — يرى الأسئلة الجديدة
    become(D)
    cur.execute('select * from public.get_exam_questions(%s)', (E1,))
    qcols = [d.name for d in cur.description]
    qs = cur.fetchall()
    become(None)
    check('C6 طالب جديد (مشترك) يرى الأسئلة المعدلة (سؤالان، بدون correct_answer في الإرجاع)',
          len(qs) == 2 and 'correct_answer' not in qcols and qs[0][2] == 'سؤال معدل جديد النص',
          f'{qcols} {str(qs)[:120]}')
    become(D)
    cur.execute('select public.submit_exam(%s, %s::jsonb)',
                (E1, json.dumps({Q1: 'جيجاهرتز'}, ensure_ascii=False)))
    sub_d = cur.fetchone()[0]['submission_id']
    become(None)
    auto_d = q1('select auto_score from public.exam_submissions where id=%s', (sub_d,))
    notif = q1('select 1 from public.notifications where student_id=%s and title=%s',
               (D, 'تم تسليم الامتحان'))
    check('C7 تسليم جديد: snapshot خاص به + تصحيح آلي (2) + إشعار',
          bool(sub_d) and auto_d and auto_d[0] == 2 and bool(notif), f'auto={auto_d}')
    become(D)
    row = q1('select review_questions from public.get_my_submission(%s)', (E1,))
    become(None)
    check('C8 مراجعة التسليم الجديد تعرض النص المعدل (Snapshot خاص به)',
          row and row[0][0]['question_text'] == 'سؤال معدل جديد النص', str(row)[:140])

    become(C)
    row = q1('select score, grade_released, review_questions from public.get_my_submission(%s)', (E2,))
    become(None)
    check('C9 نتيجة قديمة منشورة: الدرجة ظاهرة (5) + الأسئلة موجودة',
          row and row[0] == 5 and row[1] is True and isinstance(row[2], list) and len(row[2]) == 1,
          str(row)[:140])

    cur.execute('update public.exam_submissions set grade_released=true, score=3 where id=%s', (S1,))
    become(A)
    row = q1('select auto_score, score from public.get_my_submission(%s)', (E1,))
    become(None)
    check('C10 بعد نشر الدرجة: الطالب يراها في مراجعته', row and row[0] == 3 and row[1] == 3, str(row))

    # ================= D) ضبط الوصول =================
    print('\n=== D) ضبط الوصول (خاص/عام/صف/دور) ===')
    cur.execute("insert into public.exams (id, title, grade, is_published) values (%s, 'امتحان غير منشور', 'first_secondary', false)", (E7_,))
    cur.execute("insert into public.exam_questions (exam_id, question_text, type, options, correct_answer, points, order_index) values (%s, 'سؤال', 'mcq', '[\"أ\",\"ب\"]', 'أ', 1, 1)", (E7_,))

    expect_error('D1 طالب غير مشترك — جلب أسئلة امتحان خاص يُرفض',
                 B, 'select * from public.get_exam_questions(%s)', (E1,), 'خاص بالمشتركين')
    expect_error('D2 طالب غير مشترك — بدء محاولة امتحان خاص يُرفض',
                 B, 'select public.start_exam_attempt(%s)', (E1,), 'خاص بالمشتركين')
    expect_error('D3 طالب غير مشترك — التسليم المباشر في امتحان خاص يُرفض',
                 B, 'select public.submit_exam(%s, %s::jsonb)', (E1, '{}'), 'خاص بالمشتركين')
    expect_error('D4 الأدمن لا يجلب الأسئلة عبر RPC الطلابي (فحص دور الطالب)',
                 ADMIN, 'select * from public.get_exam_questions(%s)', (E1,), 'غير مسموح')
    expect_error('D5 طالب صف ثانٍ ممنوع من امتحان صف أول',
                 C, 'select * from public.get_exam_questions(%s)', (E1,), 'ليس لصفك')
    expect_error('D6 امتحان غير منشور ممنوع',
                 A, 'select * from public.get_exam_questions(%s)', (E7_,), 'غير منشور')

    become(B)
    ca_e1 = q1('select public.can_access_exam(%s)', (E1,))
    become(None)
    check('D7 can_access_exam: خاص=false لغير المشترك', ca_e1 and ca_e1[0] is False, str(ca_e1))

    become(B)
    visible = [str(r[0]) for r in q('select id from public.exams')]
    become(None)
    check('D8 RLS: طالب صف أول يرى امتحانات صفه المنشورة (حتى الخاصة — بطاقة مقفولة) ولا يرى صف ثانٍ',
          E1 in visible and E2 not in visible, str(visible))
    become(ADMIN)
    visible_admin = [str(r[0]) for r in q('select id from public.exams')]
    become(None)
    check('D9 RLS: الأدمن يرى كل الامتحانات', E1 in visible_admin and E2 in visible_admin)

    become(B)
    att_rows = q('select * from public.exam_attempts')
    sub_rows = q('select * from public.exam_submissions')
    q_rows = q('select * from public.exam_questions')
    become(None)
    check('D10 RLS: الطالب لا يلمس exam_attempts/exam_submissions/exam_questions مباشرة (فارغ له)',
          len(att_rows) == 0 and len(sub_rows) == 0 and len(q_rows) == 0,
          f'att={len(att_rows)} sub={len(sub_rows)} q={len(q_rows)}')

    # ================= E) العام + المؤقت + منع التجاوز =================
    print('\n=== E) الامتحان العام + المؤقت + منع تجاوز RPC المباشر ===')
    payload_e4 = {
        'title': 'امتحان عام جديد', 'grade': 'first_secondary', 'duration_minutes': 30,
        'is_published': True, 'access_mode': 'public',
        'questions': [
            {'question_text': 'سؤال عام 1', 'type': 'mcq', 'options': ["س1", "س2"],
             'correct_answer': 'س1', 'points': 2},
            {'question_text': 'سؤال عام 2', 'type': 'true_false', 'options': ["صح", "خطأ"],
             'correct_answer': 'صح', 'points': 1},
        ]}
    become(ADMIN)
    cur.execute('select public.save_exam(%s::jsonb)', (json.dumps(payload_e4, ensure_ascii=False),))
    E4 = str(cur.fetchone()[0])
    become(None)
    e4_qs = q('select id, correct_answer from public.exam_questions where exam_id=%s', (E4,))
    check('E1 إنشاء امتحان عام عبر save_exam (ذري) نجح', bool(E4) and len(e4_qs) == 2, str(E4))

    become(B)
    st = q1('select public.start_exam_attempt(%s)', (E4,))
    become(None)
    stj = st[0] if st else None
    ok_st = (stj and stj.get('already_submitted') is False and stj.get('deadline') is not None
             and stj.get('server_now') is not None)
    check('E2 طالب غير مشترك يبدأ امتحان عام بدون اشتراك + deadline من الخادم', bool(ok_st), str(stj))

    become(B)
    st2 = q1('select public.start_exam_attempt(%s)', (E4,))
    become(None)
    st2j = st2[0] if st2 else None
    check('E3 إعادة استدعاء start_exam_attempt لا تصفّر المؤقت (نفس started_at/deadline)',
          st2j and stj and st2j['attempt_started_at'] == stj['attempt_started_at']
          and st2j['deadline'] == stj['deadline'], f'{stj} vs {st2j}')

    become(B)
    cur.execute('select * from public.get_exam_questions(%s)', (E4,))
    qcols4 = [d.name for d in cur.description]
    qs4 = cur.fetchall()
    become(None)
    check('E4 جلب أسئلة الامتحان العام: سؤالان بدون correct_answer',
          len(qs4) == 2 and 'correct_answer' not in qcols4, str(qcols4))

    answers_e4 = {str(qid): ans for qid, ans in e4_qs}
    become(B)
    cur.execute('select public.submit_exam(%s, %s::jsonb)',
                (E4, json.dumps(answers_e4, ensure_ascii=False)))
    resp = cur.fetchone()[0]
    become(None)
    check('E5 التسليم نجح والاستجابة بلا auto_score (لا تسريب درجة قبل النشر)',
          isinstance(resp, dict) and 'submission_id' in resp and 'auto_score' not in resp, str(resp))
    expect_error('E6 التسليم المكرر مرفوض',
                 B, 'select public.submit_exam(%s, %s::jsonb)', (E4, '{}'), 'محاولة واحدة فقط')
    auto_b = q1("select auto_score from public.exam_submissions where exam_id=%s and student_id=%s", (E4, B))
    check('E7 التصحيح الآلي صحيح (2+1=3) في قاعدة البيانات',
          auto_b and auto_b[0] == 3, str(auto_b))

    become(E)
    st_e = q1('select public.start_exam_attempt(%s)', (E4,))
    become(None)
    check('E8 طالب آخر غير مشترك يبدأ الامتحان العام أيضًا (عام لكل الصف)',
          st_e and st_e[0].get('already_submitted') is False, str(st_e))

    # امتحان بدأ قبل ساعتين ومدته 30 → التسليم المباشر بلا محاولة يجب أن يُرفض
    past = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
    payload_e5 = dict(payload_e4, title='امتحان بدأ من زمان', start_at=past)
    become(ADMIN)
    cur.execute('select public.save_exam(%s::jsonb)', (json.dumps(payload_e5, ensure_ascii=False),))
    E5 = str(cur.fetchone()[0])
    become(None)
    expect_error('E9 منع تجاوز المؤقت: تسليم مباشر بلا محاولة بعد (start_at + المدة) يُرفض',
                 E, 'select public.submit_exam(%s, %s::jsonb)', (E5, '{}'), 'انتهى وقت')

    recent = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
    payload_e5b = dict(payload_e4, title='امتحان بدأ قريبا', start_at=recent)
    become(ADMIN)
    cur.execute('select public.save_exam(%s::jsonb)', (json.dumps(payload_e5b, ensure_ascii=False),))
    E5b = str(cur.fetchone()[0])
    become(None)
    become(E)
    cur.execute('select public.submit_exam(%s, %s::jsonb)', (E5b, '{}'))
    ok_direct = cur.fetchone()[0]
    become(None)
    att_e5b = q1('select 1 from public.exam_attempts where exam_id=%s and student_id=%s', (E5b, E))
    check('E10 تسليم مباشر داخل النافذة الرسمية مقبول (توافق مع الحالات الجارية) + المحاولة سُجلت',
          isinstance(ok_direct, dict) and bool(att_e5b), f'{ok_direct} att={att_e5b}')

    # تغيير الخصوصية أثناء محاولة جارية
    payload_e6 = dict(payload_e4, title='امتحان تبديل الخصوصية', access_mode='public')
    become(ADMIN)
    cur.execute('select public.save_exam(%s::jsonb)', (json.dumps(payload_e6, ensure_ascii=False),))
    E6 = str(cur.fetchone()[0])
    become(None)
    become(E)
    stx = q1('select public.start_exam_attempt(%s)', (E6,))
    become(None)
    e6_qs_full = q('select id, question_text, type, options, correct_answer, points from public.exam_questions where exam_id=%s order by order_index', (E6,))
    payload_e6_priv = {
        'id': E6, 'title': 'امتحان تبديل الخصوصية', 'grade': 'first_secondary',
        'duration_minutes': 30, 'is_published': True, 'access_mode': 'subscribers',
        'questions': [
            {'id': str(r[0]), 'question_text': r[1], 'type': r[2],
             'options': r[3] if isinstance(r[3], (list, type(None))) else json.loads(r[3]),
             'correct_answer': r[4], 'points': r[5]} for r in e6_qs_full]}
    become(ADMIN)
    cur.execute('select public.save_exam(%s::jsonb)', (json.dumps(payload_e6_priv, ensure_ascii=False),))
    become(None)
    become(E)
    cur.execute('select * from public.get_exam_questions(%s)', (E6,))
    qs6 = cur.fetchall()
    become(None)
    check('E11 المحاولة الجارية المصرح بها تُستكمل بعد تحويل الامتحان لخاص (لا انكسار)',
          qs6 and len(qs6) == 2, f'عدد الأسئلة: {len(qs6) if qs6 else 0}')
    become(E)
    cur.execute('select public.submit_exam(%s, %s::jsonb)', (E6, '{}'))
    sub_e6 = cur.fetchone()[0]
    become(None)
    check('E12 تسليم المحاولة الجارية بعد التحويل لخاص مقبول',
          isinstance(sub_e6, dict) and 'submission_id' in sub_e6, str(sub_e6))
    expect_error('E13 طالب جديد بدون اشتراك يُمنع من بدء الامتحان بعد تحويله لخاص',
                 B, 'select public.start_exam_attempt(%s)', (E6,), 'خاص بالمشتركين')

    # انتهاء مدة المحاولة (تقديم started_at ثلاث ساعات للخلف)
    become(D)
    st_d = q1('select public.start_exam_attempt(%s)', (E4,))
    become(None)
    cur.execute("update public.exam_attempts set started_at = now() - interval '3 hours' "
                "where exam_id=%s and student_id=%s", (E4, D))
    expect_error('E14 بعد انتهاء مدة المحاولة: جلب الأسئلة يُرفض',
                 D, 'select * from public.get_exam_questions(%s)', (E4,), 'انتهى وقت')
    expect_error('E15 بعد انتهاء مدة المحاولة: التسليم يُرفض',
                 D, 'select public.submit_exam(%s, %s::jsonb)', (E4, '{}'), 'انتهى وقت')

    # end_at صارم
    cur.execute("update public.exams set end_at = now() - interval '1 hour' where id=%s", (E4,))
    expect_error('E16 بعد انتهاء end_at: بدء محاولة جديدة يُرفض (بدون مهلة)',
                 E, 'select public.start_exam_attempt(%s)', (E4,), 'انتهى وقت')

    # ذرية save_exam
    title_before = q1('select title from public.exams where id=%s', (E4,))
    qs_before = q1('select count(*) from public.exam_questions where exam_id=%s', (E4,))
    bad_payload = dict(payload_e4, id=E4, title='عنوان ملغى',
                       questions=[{'id': '99999999-9999-4999-8999-999999999999',
                                   'question_text': 'سؤال وهمي', 'type': 'mcq',
                                   'options': ["أ"], 'correct_answer': 'أ', 'points': 1}])
    expect_error('E17 save_exam بمعرف سؤال غير موجود يفشل',
                 ADMIN, 'select public.save_exam(%s::jsonb)',
                 (json.dumps(bad_payload, ensure_ascii=False),), 'السؤال المطلوب')
    title_after = q1('select title from public.exams where id=%s', (E4,))
    qs_after = q1('select count(*) from public.exam_questions where exam_id=%s', (E4,))
    check('E18 ذرية save_exam: لا العنوان تغير ولا الأسئلة (فشل كامل = لا تغيير)',
          title_before == title_after and qs_before == qs_after,
          f'{title_before}/{title_after} {qs_before}/{qs_after}')

    expect_error('E19 save_exam لغير الأدمن مرفوض',
                 A, 'select public.save_exam(%s::jsonb)',
                 (json.dumps(payload_e4, ensure_ascii=False),), 'غير مصرح')
    bad_priv = dict(payload_e4, access_mode='everyone')
    expect_error('E20 قيمة خصوصية غير صحيحة مرفوضة',
                 ADMIN, 'select public.save_exam(%s::jsonb)',
                 (json.dumps(bad_priv, ensure_ascii=False),), 'خصوصية')

    # ================= F) إعادة التشغيل =================
    print('\n=== F) إعادة تشغيل الجزأين بأمان ===')
    snap_before = q1('select question_snapshot from public.exam_submissions where id=%s', (S1,))[0]
    sub_count_before = q1('select count(*) from public.exam_submissions')[0]
    try:
        cur.execute(PART1)
        cur.execute(PART2)
        check('F1 إعادة تشغيل الجزأين نجحت بدون أخطاء', True)
    except Exception as exc:
        check('F1 إعادة تشغيل الجزأين نجحت بدون أخطاء', False, str(exc)[:250])
    snap_after = q1('select question_snapshot from public.exam_submissions where id=%s', (S1,))[0]
    sub_count_after = q1('select count(*) from public.exam_submissions')[0]
    check('F2 الـ Backfill لم يمس التسليمات المجمدة (نفس الـ Snapshot حرفيًا)',
          snap_before == snap_after)
    check('F3 لا تغيير في عدد التسليمات', sub_count_before == sub_count_after)
    become(A)
    row = q1('select review_questions from public.get_my_submission(%s)', (E1,))
    become(None)
    check('F4 مراجعة النتيجة القديمة سليمة بعد إعادة التشغيل (3 أسئلة أصلية)',
          row and len(row[0]) == 3 and row[0][0]['question_text'] == 'ما وحدة قياس سرعة المعالج؟',
          str(row)[:140])
    check('F5 Snapshot ما قبل إعادة التشغيل مطابق لما بعدها',
          snap_before_rerun.get('questions')[0]['question_text']
          == snap_after.get('questions')[0]['question_text'])
    fn_deadline = q1("select pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace "
                     "where n.nspname='public' and p.proname='exam_attempt_deadline'")
    check('F6 exam_attempt_deadline بعد إعادة التشغيل بلا حد عالمي من start_at (إصلاح 048)',
          bool(fn_deadline) and 'p_exam.start_at + make_interval' not in fn_deadline[0],
          str(fn_deadline)[:150] if fn_deadline else 'غير موجودة')

    # ================= H) إصلاح 048 — إعادة إنتاج مشكلة الإنتاج ثم إثبات الإصلاح =================
    print('\n=== H) إصلاح 048: امتحان «عام» مضى على نشره 10 ساعات (محاكاة قاعدة الإنتاج) ===')
    # قاعدة منفصلة تحاكي الإنتاج الحالي: part1+part2 بالتعريف القديم
    # (حد عالمي start_at+المدة) ثم نطبق 048 ونتأكد أن المشكلة اختفت.
    fresh_db(admin_conn, 'vision_test_hotfix')
    conn3 = psycopg.connect(uri, dbname='vision_test_hotfix', autocommit=True)
    cur3 = conn3.cursor()
    cur3.execute(SCHEMA)
    cur3.execute(SEED)
    cur3.execute(PART1)
    cur3.execute(PART2)
    cur3.execute(OLD_DEADLINE)  # تعريف الإنتاج الحالي (قبل 048)

    def q3(sql, params=()):
        cur3.execute(sql, params)
        return cur3.fetchall() if cur3.description else None

    def q3one(sql, params=()):
        rows = q3(sql, params)
        return rows[0] if rows else None

    def become3(uid=None):
        cur3.execute('reset role')
        if uid:
            cur3.execute("select set_config('app.current_uid', %s, false)", (str(uid),))
            cur3.execute('set role authenticated')
        else:
            cur3.execute("select set_config('app.current_uid', '', false)")

    def expect_error3(name, uid, sql, params, needle):
        become3(uid)
        try:
            cur3.execute(sql, params)
            got = cur3.fetchall() if cur3.description else None
            check(name, False, f'لم يُطلق الخطأ المتوقع — النتيجة: {got}')
        except psycopg.Error as exc:
            check(name, needle in str(exc), str(exc).strip()[:140])
        finally:
            become3(None)

    # نفس بلاغ المستخدم: امتحان عام منشور، بدأ قبل 10 ساعات، مدته 60 دقيقة، بلا end_at
    payload_h = {
        'title': 'امتحان عام منشور من 10 ساعات', 'grade': 'first_secondary',
        'duration_minutes': 60, 'is_published': True, 'access_mode': 'public',
        'start_at': (datetime.now(timezone.utc) - timedelta(hours=10)).isoformat(),
        'questions': [
            {'question_text': 'سؤال 1', 'type': 'mcq', 'options': ['أ', 'ب'],
             'correct_answer': 'أ', 'points': 2},
            {'question_text': 'سؤال 2', 'type': 'true_false', 'options': ['صح', 'خطأ'],
             'correct_answer': 'صح', 'points': 1},
        ]
    }
    become3(ADMIN)
    cur3.execute('select public.save_exam(%s::jsonb)', (json.dumps(payload_h, ensure_ascii=False),))
    HEX = str(cur3.fetchone()[0])
    become3(None)
    check('H1 إنشاء الامتحان المنشور (بلاغ الإنتاج) نجح', bool(HEX), HEX)

    expect_error3('H2 المشكلة معاد إنتاجها: بدء محاولة بعد 10 ساعات يُرفض (غير متاح)',
                  B, 'select public.start_exam_attempt(%s)', (HEX,), 'انتهى وقت')

    try:
        cur3.execute(HOTFIX)
        check('H3 تطبيق 048_exam_window_fix.sql نجح', True)
    except Exception as exc:
        check('H3 تطبيق 048_exam_window_fix.sql نجح', False, str(exc)[:250])

    become3(B)
    stx = q3one('select public.start_exam_attempt(%s)', (HEX,))
    become3(None)
    # jsonb يرجّع الطوابع الزمنية نصوص ISO — نحولها لمقارنة دقيقة
    try:
        started_dt = datetime.fromisoformat(str(stx[0]['attempt_started_at'])) if stx else None
        deadline_dt = datetime.fromisoformat(str(stx[0]['deadline'])) if stx else None
    except ValueError:
        started_dt = deadline_dt = None
    ok_h4 = (stx and stx[0].get('already_submitted') is False
             and started_dt is not None and deadline_dt is not None
             and deadline_dt == started_dt + timedelta(minutes=61))
    check('H4 بعد الإصلاح: الطالب يبدأ ويأخذ مدته كاملة (الموعد = بدء المحاولة + 60د + مهلة)',
          bool(ok_h4), str(stx))

    become3(B)
    cur3.execute('select * from public.get_exam_questions(%s)', (HEX,))
    qs_h = cur3.fetchall()
    become3(None)
    check('H5 بعد الإصلاح: جلب الأسئلة يعمل (سؤالان)', len(qs_h or []) == 2, str(qs_h)[:120])

    h_ans = {str(r[0]): r[1] for r in q3(
        'select id, correct_answer from public.exam_questions where exam_id=%s', (HEX,))}
    become3(B)
    cur3.execute('select public.submit_exam(%s, %s::jsonb)',
                 (HEX, json.dumps(h_ans, ensure_ascii=False)))
    resp_h = cur3.fetchone()[0]
    become3(None)
    auto_h = q3one('select auto_score from public.exam_submissions where exam_id=%s and student_id=%s', (HEX, B))
    check('H6 بعد الإصلاح: التسليم يعمل والتصحيح الآلي صحيح (3)',
          isinstance(resp_h, dict) and 'submission_id' in resp_h and auto_h and auto_h[0] == 3,
          f'{resp_h} auto={auto_h}')

    try:
        cur3.execute(HOTFIX)
        check('H7 إعادة تشغيل 048 آمنة (لا تغيير ولا خطأ)', True)
    except Exception as exc:
        check('H7 إعادة تشغيل 048 آمنة (لا تغيير ولا خطأ)', False, str(exc)[:250])

    # امتحان آخر بنفس المواصفات — لفحوص منع التجاوز وend_at بعد الإصلاح
    payload_h2 = dict(payload_h, title='امتحان عام آخر منشور من 10 ساعات')
    become3(ADMIN)
    cur3.execute('select public.save_exam(%s::jsonb)', (json.dumps(payload_h2, ensure_ascii=False),))
    HEX2 = str(cur3.fetchone()[0])
    become3(None)
    expect_error3('H8 لا تجاوز: تسليم مباشر (RPC) بلا محاولة بعد (start_at+المدة) يُرفض',
                  E, 'select public.submit_exam(%s, %s::jsonb)', (HEX2, '{}'), 'انتهى وقت')

    become3(E)
    cur3.execute('select public.start_exam_attempt(%s)', (HEX2,))
    become3(None)
    cur3.execute("update public.exam_attempts set started_at = now() - interval '3 hours' "
                 "where exam_id=%s and student_id=%s", (HEX2, E))
    expect_error3('H9 محاولة بدأت من 3 ساعات بلا تسليم: جلب الأسئلة يُرفض (المؤقت مثبت)',
                  E, 'select * from public.get_exam_questions(%s)', (HEX2,), 'انتهى وقت')
    expect_error3('H10 محاولة منقضية: التسليم يُرفض (محاولة واحدة لكل طالب)',
                  E, 'select public.submit_exam(%s, %s::jsonb)', (HEX2, '{}'), 'انتهى وقت')

    cur3.execute("update public.exams set end_at = now() - interval '1 hour' where id=%s", (HEX2,))
    expect_error3('H11 end_at صارم بعد الإصلاح: بدء محاولة جديدة بعد انتهائه يُرفض',
                  A, 'select public.start_exam_attempt(%s)', (HEX2,), 'انتهى وقت')
    conn3.close()

    # ================= G) ترتيب خاطئ: الجزء 2 قبل الجزء 1 =================
    print('\n=== G) تشغيل الجزء 2 قبل الجزء 1 (يجب أن يُرفض) ===')
    fresh_db(admin_conn, 'vision_test_neg')
    conn2 = psycopg.connect(uri, dbname='vision_test_neg', autocommit=True)
    cur2 = conn2.cursor()
    cur2.execute(SCHEMA)
    cur2.execute(SEED)
    try:
        cur2.execute(PART2)
        check('G1 الجزء 2 بدون الجزء 1 يُرفض برسالة واضحة', False, 'لم يُرفض!')
    except psycopg.Error as exc:
        check('G1 الجزء 2 بدون الجزء 1 يُرفض برسالة واضحة',
              'أولاً' in str(exc), str(exc).strip()[:140])
    conn2.close()

    print(f'\n{"=" * 60}')
    print(f'النتيجة النهائية: {PASS} ناجح / {FAIL} فاشل')
    print('=' * 60)
    conn.close()
    admin_conn.close()
    sys.exit(1 if FAIL else 0)


if __name__ == '__main__':
    try:
        main()
    except SystemExit:
        raise
    except Exception:
        traceback.print_exc()
        sys.exit(2)
