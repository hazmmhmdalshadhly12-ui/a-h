#!/usr/bin/env python3
"""محاكاة سياسات نظام الامتحانات (Migration 047) — نموذج Python مطابق لمنطق SQL.

هذه ليست اختبار قاعدة بيانات حية (لا يوجد PostgreSQL محلي)، بل محاكاة دقيقة
لمنطق الدوال الأربع: start_exam_attempt / get_exam_questions / submit_exam /
exam_attempt_deadline (بعد إصلاح 048: المدة لكل طالب من بدء محاولته،
والنافذة [start_at , end_at] — لا حد عالمي من start_at)،
تُغطي مصفوفة السيناريوهات المطلوبة (Tests A–G).

الاستخدام: python3 scripts/simulate_exam_policy.py
"""
from __future__ import annotations

import sys
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

GRACE = timedelta(seconds=60)
INF = datetime.max.replace(tzinfo=timezone.utc)


def now_fn() -> datetime:
    return _NOW[0]


_NOW = [datetime(2026, 11, 22, 10, 0, tzinfo=timezone.utc)]


class PolicyError(Exception):
    """ترجمة لـ raise exception داخل دوال SQL"""


@dataclass
class Exam:
    id: str
    grade: str = "first_secondary"
    is_published: bool = True
    access_mode: str = "subscribers"
    duration_minutes: int | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None


@dataclass
class Question:
    id: str
    exam_id: str
    type: str = "mcq"
    correct_answer: str | None = "A"
    points: int = 1
    order_index: int = 1
    question_text: str = "سؤال"


@dataclass
class Student:
    id: str
    grade: str = "first_secondary"
    role: str = "student"
    confirmed_booking: bool = False


@dataclass
class Attempt:
    exam_id: str
    student_id: str
    started_at: datetime
    access_ok: bool = True


@dataclass
class Submission:
    exam_id: str
    student_id: str
    answers: dict
    auto_score: float = 0
    question_snapshot: dict = field(default_factory=dict)


class DB:
    """نموذج مصغر يطابق جداول SQL: exams / exam_questions / exam_attempts / exam_submissions"""

    def __init__(self) -> None:
        self.exams: dict[str, Exam] = {}
        self.questions: dict[str, list[Question]] = {}
        self.attempts: dict[tuple[str, str], Attempt] = {}
        self.submissions: dict[tuple[str, str], Submission] = {}
        self.deleted_exams: list[str] = []

    # ---------- exam_attempt_deadline (SQL — بعد إصلاح 048) ----------
    # cutoff = أقرب (end_at , بدء المحاولة + المدة + مهلة) — لا حد عالمي من start_at
    @staticmethod
    def deadline(exam: Exam, attempt_started: datetime | None) -> datetime:
        c1 = exam.end_at or INF
        c2 = (
            attempt_started + timedelta(minutes=exam.duration_minutes) + GRACE
            if exam.duration_minutes and exam.duration_minutes > 0 and attempt_started
            else INF
        )
        return min(c1, c2)

    # ---------- حارس الحذف (trigger) ----------
    def delete_exam(self, exam_id: str) -> None:
        exam = self.exams.get(exam_id)
        if not exam:
            raise PolicyError("الامتحان غير موجود")
        if any(s.exam_id == exam_id for s in self.submissions.values()):
            raise PolicyError("لا يمكن حذف امتحان له نتائج طلاب — استخدم إلغاء النشر بدلاً من الحذف")
        del self.exams[exam_id]
        self.deleted_exams.append(exam_id)
        self.questions.pop(exam_id, None)
        self.attempts.pop(exam_id, None) if False else None  # attempts تُمسح عبر cascade

    # ---------- has_confirmed_booking (043 — بدون تغيير) ----------
    @staticmethod
    def has_confirmed_booking(student: Student) -> bool:
        return student.confirmed_booking

    # ---------- get_exam_questions (047) ----------
    def get_exam_questions(self, student: Student, exam_id: str) -> list[Question]:
        exam = self.exams.get(exam_id)
        if not exam:
            raise PolicyError("الامتحان غير موجود")
        submitted = (exam_id, student.id) in self.submissions
        if submitted:
            return list(self.questions.get(exam_id, []))

        if not exam.is_published:
            raise PolicyError("هذا الامتحان غير منشور")
        if exam.grade != student.grade:
            raise PolicyError("هذا الامتحان ليس لصفك")

        attempt = self.attempts.get((exam_id, student.id))
        attempt_ok = attempt.access_ok if attempt else False
        if (
            exam.access_mode == "subscribers"
            and not self.has_confirmed_booking(student)
            and not attempt_ok
        ):
            raise PolicyError("هذا الامتحان خاص بالمشتركين المؤكدين — فعّل اشتراكك أولاً من صفحة الحجوزات")

        t = now_fn()
        if exam.start_at and t < exam.start_at:
            raise PolicyError("لم يبدأ وقت الامتحان بعد")
        if exam.end_at and t > exam.end_at:
            raise PolicyError("انتهى وقت الامتحان")

        attempt_started = attempt.started_at if attempt else None
        if student.role == "student":
            if (exam_id, student.id) not in self.attempts:
                self.attempts[(exam_id, student.id)] = Attempt(exam_id, student.id, t, True)
            attempt_started = self.attempts[(exam_id, student.id)].started_at

        if t > self.deadline(exam, attempt_started):
            raise PolicyError("انتهى وقت الامتحان")
        return list(self.questions.get(exam_id, []))

    # ---------- start_exam_attempt (047) ----------
    def start_exam_attempt(self, student: Student, exam_id: str) -> dict:
        if student.role != "student":
            raise PolicyError("غير مسموح للطالب الحالي بتسليم الامتحانات")
        exam = self.exams.get(exam_id)
        if not exam:
            raise PolicyError("الامتحان غير موجود")
        if (exam_id, student.id) in self.submissions:
            return {"already_submitted": True}

        if not exam.is_published:
            raise PolicyError("هذا الامتحان غير منشور")
        if exam.grade != student.grade:
            raise PolicyError("هذا الامتحان ليس لصفك")

        attempt = self.attempts.get((exam_id, student.id))
        if attempt is None:
            if exam.access_mode == "subscribers" and not self.has_confirmed_booking(student):
                raise PolicyError("هذا الامتحان خاص بالمشتركين المؤكدين — فعّل اشتراكك أولاً من صفحة الحجوزات")

        t = now_fn()
        if exam.start_at and t < exam.start_at:
            raise PolicyError("لم يبدأ وقت الامتحان بعد")
        if exam.end_at and t > exam.end_at:
            raise PolicyError("انتهى وقت الامتحان")

        if attempt is None:
            attempt = Attempt(exam_id, student.id, t, True)
            self.attempts[(exam_id, student.id)] = attempt

        cutoff = self.deadline(exam, attempt.started_at)
        if t > cutoff:
            raise PolicyError("انتهى وقت الامتحان")
        return {
            "already_submitted": False,
            "attempt_started_at": attempt.started_at,
            "deadline": None if cutoff == INF else cutoff,
            "server_now": t,
        }

    # ---------- submit_exam (047) ----------
    def submit_exam(self, student: Student, exam_id: str, answers: dict) -> dict:
        if student.role != "student":
            raise PolicyError("غير مسموح للطالب الحالي بتسليم الامتحانات")
        exam = self.exams.get(exam_id)
        if not exam:
            raise PolicyError("الامتحان غير موجود")
        if (exam_id, student.id) in self.submissions:
            raise PolicyError("محاولة واحدة فقط لكل امتحان — تم تسليم هذا الامتحان مسبقاً")
        if not exam.is_published:
            raise PolicyError("هذا الامتحان غير منشور")
        if exam.grade != student.grade:
            raise PolicyError("هذا الامتحان ليس لصفك")

        attempt = self.attempts.get((exam_id, student.id))
        attempt_ok = attempt.access_ok if attempt else False
        if (
            exam.access_mode == "subscribers"
            and not self.has_confirmed_booking(student)
            and not attempt_ok
        ):
            raise PolicyError("هذا الامتحان خاص بالمشتركين المؤكدين — فعّل اشتراكك أولاً من صفحة الحجوزات")

        t = now_fn()
        if exam.start_at and t < exam.start_at:
            raise PolicyError("لم يبدأ وقت الامتحان بعد")
        if exam.end_at and t > exam.end_at:
            raise PolicyError("انتهى وقت الامتحان")

        # المهلة من بدء المحاولة، وإن لم توجد (استدعاء RPC مباشر) فالمرجع
        # start_at الرسمي — قبل تسجيل أي محاولة جديدة (كما في SQL)
        ref_started = attempt.started_at if attempt else exam.start_at
        if t > self.deadline(exam, ref_started):
            raise PolicyError("انتهى وقت الامتحان")

        if attempt is None:
            attempt = Attempt(exam_id, student.id, t, True)
            self.attempts[(exam_id, student.id)] = attempt

        # التصحيح — نفس منطق SQL القديم تمامًا
        auto = 0.0
        for q in self.questions.get(exam_id, []):
            a = answers.get(q.id)
            if q.type != "short_answer" and a is not None and a == q.correct_answer:
                auto += q.points or 0

        snapshot = {
            "captured_at": t,
            "questions": [
                {
                    "id": q.id,
                    "question_text": q.question_text,
                    "type": q.type,
                    "options": [],
                    "points": q.points,
                    "order_index": q.order_index,
                    "correct_answer": q.correct_answer,
                }
                for q in self.questions.get(exam_id, [])
            ],
        }
        sub = Submission(exam_id, student.id, answers, auto, snapshot)
        self.submissions[(exam_id, student.id)] = sub
        return {"submission_id": "sub-1"}

    # ---------- save_exam (047) ----------
    def save_exam(self, is_admin: bool, payload: dict, existing_exam_id: str | None = None) -> str:
        if not is_admin:
            raise PolicyError("غير مصرح — صلاحية أدمن مطلوبة")
        if not (payload.get("title") or "").strip():
            raise PolicyError("عنوان الامتحان مطلوب")
        qs = payload.get("questions", [])
        if len(qs) == 0:
            raise PolicyError("أضف سؤالاً واحداً على الأقل قبل الحفظ")
        for q in qs:
            if not (q.get("question_text") or "").strip():
                raise PolicyError("نص السؤال مطلوب لكل الأسئلة")
            if q.get("type") != "short_answer" and not (q.get("correct_answer") or "").strip():
                raise PolicyError("كل سؤال موضوعي لازم يكون ليه إجابة صحيحة")

        if existing_exam_id:
            exam = self.exams[existing_exam_id]
            exam.title = payload["title"]
            exam.access_mode = payload.get("access_mode", exam.access_mode)
            exam.is_published = payload.get("is_published", exam.is_published)
            # حذف المحذوف فقط + تحديث القائم بنفس المعرفات + إدراج الجديد
            keep = {q["id"] for q in qs if q.get("id")}
            self.questions[existing_exam_id] = [
                q for q in self.questions.get(existing_exam_id, []) if q.id in keep
            ]
            for i, q in enumerate(qs):
                if q.get("id"):
                    for ex in self.questions[existing_exam_id]:
                        if ex.id == q["id"]:
                            ex.question_text = q["question_text"]
                            ex.correct_answer = q.get("correct_answer")
                            ex.order_index = i + 1
                else:
                    self.questions[existing_exam_id].append(
                        Question(str(uuid.uuid4()), existing_exam_id, q.get("type", "mcq"),
                                 q.get("correct_answer"), q.get("points", 1), i + 1, q["question_text"])
                    )
            return existing_exam_id
        else:
            eid = str(uuid.uuid4())
            self.exams[eid] = Exam(
                eid,
                grade=payload.get("grade", "first_secondary"),
                is_published=payload.get("is_published", False),
                access_mode=payload.get("access_mode", "subscribers"),
                duration_minutes=payload.get("duration_minutes"),
                start_at=payload.get("start_at"),
                end_at=payload.get("end_at"),
            )
            self.questions[eid] = [
                Question(str(uuid.uuid4()), eid, q.get("type", "mcq"), q.get("correct_answer"),
                         q.get("points", 1), i + 1, q["question_text"])
                for i, q in enumerate(qs)
            ]
            return eid


# =====================================================================
# السيناريوهات
# =====================================================================
PASSED: list[str] = []
FAILED: list[str] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    (PASSED if cond else FAILED).append(f"{name}{(' — ' + detail) if detail and not cond else ''}")


def expect_policy_error(db: DB, fn, *args, contains: str) -> tuple[bool, str]:
    try:
        fn(*args)
        return False, "لم يُرفض الطلب!"
    except PolicyError as e:
        return contains in str(e), str(e)


def scenario_a_public_exam() -> None:
    """Test A — امتحان عام: طالب من الصف غير مشترك يدخل ويسلم، وطالب صف آخر ممنوع."""
    db = DB()
    eid = db.save_exam(True, {
        "title": "امتحان عام", "grade": "first_secondary", "is_published": True,
        "access_mode": "public", "duration_minutes": 60,
        "start_at": now_fn() - timedelta(minutes=10), "end_at": now_fn() + timedelta(hours=2),
        "questions": [{"question_text": "س1", "type": "mcq", "correct_answer": "A", "points": 2},
                      {"question_text": "س2", "type": "true_false", "correct_answer": "true", "points": 1}],
    })
    s = Student("s1", "first_secondary", confirmed_booking=False)  # غير مشترك
    r = db.start_exam_attempt(s, eid)
    check("A: بدء المحاولة لطالب غير مشترك في امتحان عام", r["already_submitted"] is False)
    qs = db.get_exam_questions(s, eid)
    check("A: جلب الأسئلة بدون اشتراك", len(qs) == 2)
    res = db.submit_exam(s, eid, {qs[0].id: "A", qs[1].id: "true"})
    check("A: التسليم بدون اشتراك", "submission_id" in res)
    check("A: الدرجة الآلية صحيحة (2+1)", db.submissions[(eid, "s1")].auto_score == 3)

    other = Student("s2", "second_secondary")  # صف آخر
    ok, msg = expect_policy_error(db, db.get_exam_questions, other, eid, contains="ليس لصفك")
    check("A: منع طالب صف آخر من الأسئلة", ok, msg)
    ok, msg = expect_policy_error(db, db.submit_exam, other, eid, {}, contains="ليس لصفك")
    check("A: منع طالب صف آخر من التسليم", ok, msg)


def scenario_b_subscribers_exam() -> None:
    """Test B — امتحان خاص: المشترك يدخل، وغير المشترك ممنوع من كل نقاط الدخول."""
    db = DB()
    eid = db.save_exam(True, {
        "title": "امتحان خاص", "grade": "first_secondary", "is_published": True,
        "access_mode": "subscribers",
        "start_at": now_fn() - timedelta(minutes=5), "end_at": now_fn() + timedelta(hours=2),
        "questions": [{"question_text": "س1", "type": "mcq", "correct_answer": "A"}],
    })
    sub = Student("sub1", confirmed_booking=True)
    db.start_exam_attempt(sub, eid)
    check("B: المشترك المؤكد يبدأ ويسلم", "submission_id" in db.submit_exam(sub, eid, {}))

    nosub = Student("nosub1", confirmed_booking=False)
    ok, msg = expect_policy_error(db, db.start_exam_attempt, nosub, eid, contains="خاص بالمشتركين")
    check("B: منع غير المشترك من بدء المحاولة (RPC مباشر)", ok, msg)
    ok, msg = expect_policy_error(db, db.get_exam_questions, nosub, eid, contains="خاص بالمشتركين")
    check("B: منع غير المشترك من جلب الأسئلة (RPC مباشر)", ok, msg)
    ok, msg = expect_policy_error(db, db.submit_exam, nosub, eid, {}, contains="خاص بالمشتركين")
    check("B: منع غير المشترك من التسليم (RPC مباشر)", ok, msg)


def scenario_c_access_mode_changes() -> None:
    """Test C — تغيير الخصوصية في كل الاتجاهات (منشور/قديم/له نتائج/له محاولة جارية)."""
    db = DB()
    eid = db.save_exam(True, {
        "title": "خاص→عام", "grade": "first_secondary", "is_published": True,
        "access_mode": "subscribers", "duration_minutes": 120,
        "start_at": now_fn() - timedelta(minutes=30), "end_at": now_fn() + timedelta(hours=5),
        "questions": [{"question_text": "س1", "type": "mcq", "correct_answer": "A", "points": 5}],
    })
    nosub = Student("n1")
    ok, _ = expect_policy_error(db, db.start_exam_attempt, nosub, eid, contains="خاص بالمشتركين")
    assert ok

    # خاص → عام (امتحان منشور قديم): غير المشترك يدخل فورًا
    db.exams[eid].access_mode = "public"
    r = db.start_exam_attempt(nosub, eid)
    check("C: خاص→عام — غير المشترك يبدأ المحاولة", r["already_submitted"] is False)
    db.submit_exam(nosub, eid, {})
    check("C: خاص→عام — التسليم يعمل", (eid, "n1") in db.submissions)

    # عام → خاص: محاولات/نتائج سابقة محفوظة + منع الجدد غير المستوفين
    db.exams[eid].access_mode = "subscribers"
    check("C: عام→خاص — التسليم السابق لم يُحذف", (eid, "n1") in db.submissions)
    nosub2 = Student("n2")
    ok, msg = expect_policy_error(db, db.start_exam_attempt, nosub2, eid, contains="خاص بالمشتركين")
    check("C: عام→خاص — منع محاولات جديدة لغير المشترك", ok, msg)

    # محاولة جارية بدأت والوضع عام → تحول الامتحان لخاص → الطالب يكمل ويسلم (سياسة access_ok)
    eid2 = db.save_exam(True, {
        "title": "محاولة جارية", "grade": "first_secondary", "is_published": True,
        "access_mode": "public", "duration_minutes": 60, "start_at": now_fn() - timedelta(minutes=1),
        "end_at": now_fn() + timedelta(hours=5),
        "questions": [{"question_text": "س", "type": "mcq", "correct_answer": "A"}],
    })
    ongoing = Student("n3")
    db.start_exam_attempt(ongoing, eid2)
    db.exams[eid2].access_mode = "subscribers"
    check("C: محاولة جارية — بدأت كمصرح بها (access_ok)", db.attempts[(eid2, "n3")].access_ok is True)
    check(
        "C: محاولة جارية — استكمال جلب الأسئلة بعد التحويل",
        len(db.get_exam_questions(ongoing, eid2)) == 1,
    )
    check("C: محاولة جارية — التسليم مسموح بعد التحويل", "submission_id" in db.submit_exam(ongoing, eid2, {}))


def scenario_d_multiple_students() -> None:
    """Test D — عدة طلاب: استقلال التسليمات ومنع التكرار لنفس الطالب."""
    db = DB()
    eid = db.save_exam(True, {
        "title": "متعدد", "grade": "first_secondary", "is_published": True, "access_mode": "public",
        "start_at": now_fn() - timedelta(minutes=1), "end_at": now_fn() + timedelta(hours=3),
        "questions": [{"question_text": "س", "type": "mcq", "correct_answer": "A", "points": 1},
                      {"question_text": "س2", "type": "short_answer"}],
    })
    ids = [f"s{i}" for i in range(3)]
    for sid in ids:
        st = Student(sid)
        db.start_exam_attempt(st, eid)
        qs = db.get_exam_questions(st, eid)
        db.submit_exam(st, eid, {qs[0].id: "A", qs[1].id: f"إجابة {sid}"})
    check("D: تسليم الطلاب الثلاثة استقلالًا", len(db.submissions) == 3)
    check("D: إجابات الطلاب غير متداخلة",
          db.submissions[(eid, "s0")].answers != db.submissions[(eid, "s1")].answers)

    s0 = Student("s0")
    ok, msg = expect_policy_error(db, db.submit_exam, s0, eid, {}, contains="محاولة واحدة")
    check("D: منع نفس الطالب من التسليم مرتين", ok, msg)
    # تسليم طالب لا يمنع الآخرين (s1 سلم بالفعل، لكن طالب جديد يدخل عادي)
    s9 = Student("s9")
    db.start_exam_attempt(s9, eid)
    check("D: طالب جديد يدخل بعد تسليمات الآخرين", (eid, "s9") in db.attempts)


def scenario_e_data_integrity() -> None:
    """Test E — سلامة البيانات: Snapshot + الحفاظ على معرفات الأسئلة + حارس الحذف."""
    db = DB()
    eid = db.save_exam(True, {
        "title": "سلامة", "grade": "first_secondary", "is_published": True, "access_mode": "public",
        "start_at": now_fn() - timedelta(minutes=1), "end_at": None,
        "questions": [
            {"question_text": "النص الأصلي", "type": "mcq", "correct_answer": "A", "points": 3},
            {"question_text": "سؤال يُحذف لاحقًا", "type": "mcq", "correct_answer": "B", "points": 2},
        ],
    })
    st = Student("snap1")
    db.start_exam_attempt(st, eid)
    qs = db.get_exam_questions(st, eid)
    db.submit_exam(st, eid, {qs[0].id: "A", qs[1].id: "B"})
    sub = db.submissions[(eid, "snap1")]
    check("E: Snapshot محفوظ مع التسليم", len(sub.question_snapshot["questions"]) == 2)

    # تعديل الامتحان: تغيير نص السؤال الأول وحذف الثاني — نفس معرف الأول
    q1_id = qs[0].id
    db.save_exam(True, {
        "title": "سلامة", "is_published": True, "questions": [
            {"id": q1_id, "question_text": "نص معدل تمامًا", "type": "mcq", "correct_answer": "C", "points": 10},
        ],
    }, existing_exam_id=eid)
    live = db.questions[eid]
    check("E: معرف السؤال المعدل محفوظ (لا حذف وإعادة إنشاء)", any(q.id == q1_id for q in live))
    check("E: عدد الأسئلة الحية = 1 (المحذوف حُذف)", len(live) == 1)

    # مراجعة الطالب القديمة تعتمد Snapshot — لا تتأثر بالتعديل
    snap_q1 = next(q for q in sub.question_snapshot["questions"] if q["id"] == q1_id)
    check("E: مراجعة الطالب تعرض النص الأصلي من Snapshot", snap_q1["question_text"] == "النص الأصلي")
    check("E: Snapshot يحتفظ بالدرجة الأصلية (3)", snap_q1["points"] == 3)

    # حارس الحذف
    ok, msg = expect_policy_error(db, db.delete_exam, eid, contains="لا يمكن حذف")
    check("E: رفض حذف امتحان له نتائج", ok, msg)
    # امتحان بدون نتائج يُحذف عادي
    eid2 = db.save_exam(True, {"title": "فارغ", "questions": [{"question_text": "س", "type": "mcq", "correct_answer": "A"}]})
    db.delete_exam(eid2)
    check("E: امتحان بدون نتائج يُحذف", eid2 not in db.exams)

    # ذرية save_exam: فشل التحقق لا يغير شيئًا
    before = len(db.questions[eid]), db.exams[eid].title
    ok, msg = expect_policy_error(
        db, db.save_exam, True,
        {"title": "عنوان", "is_published": True,
         "questions": [{"question_text": "س", "type": "mcq", "correct_answer": ""}]},
        eid, contains="إجابة صحيحة",
    )
    check("E: رفض حفظ سؤال موضوعي بدون إجابة صحيحة", ok, msg)
    after = len(db.questions[eid]), db.exams[eid].title
    check("E: فشل الحفظ لا يغير أي بيانات (ذرية)", before == after)
    ok, msg = expect_policy_error(
        db, db.save_exam, True,
        {"title": "عنوان", "is_published": True, "questions": []},
        eid, contains="أضف سؤالاً",
    )
    check("E: رفض حفظ امتحان بدون أسئلة (لا امتحان منشور ناقص)", ok, msg)


def scenario_f_timer() -> None:
    """Test F — المؤقت بعد إصلاح 048: دخول متأخر يأخذ مدة كاملة + التحديث + المهلة + end_at."""
    db = DB()
    start = now_fn() - timedelta(minutes=50)
    eid = db.save_exam(True, {
        "title": "مؤقت", "grade": "first_secondary", "is_published": True, "access_mode": "public",
        "duration_minutes": 60, "start_at": start, "end_at": now_fn() + timedelta(hours=6),
        "questions": [{"question_text": "س", "type": "mcq", "correct_answer": "A"}],
    })
    st = Student("t1")
    r = db.start_exam_attempt(st, eid)
    # دخول متأخر 50 دقيقة: مدة كاملة من بدء محاولته — لا حد عالمي من start_at
    check("F: دخول متأخر — مدة كاملة من بدء المحاولة (لا حد عالمي)",
          r["deadline"] == r["attempt_started_at"] + timedelta(minutes=60) + GRACE)

    # تحديث الصفحة: المحاولة نفسها لا تُصفّر
    _NOW[0] += timedelta(minutes=5)
    r2 = db.start_exam_attempt(st, eid)
    check("F: تحديث الصفحة لا يصفّر المحاولة (نفس وقت البدء)",
          r2["attempt_started_at"] == r["attempt_started_at"])
    check("F: الموعد النهائي ثابت بعد التحديث", r2["deadline"] == r["deadline"])

    # التسليم داخل مهلة الـ 60 ثانية بعد انتهاء مدة المحاولة مقبول
    _NOW[0] = r["attempt_started_at"] + timedelta(minutes=60, seconds=30)
    qs = db.get_exam_questions(st, eid)
    check("F: الأسئلة متاحة داخل مهلة التسليم", len(qs) == 1)
    check("F: التسليم خلال مهلة الـ 60 ثانية مقبول", "submission_id" in db.submit_exam(st, eid, {}))

    # طالب يبدأ بعد مرور المدة من start_at — مسموح (الإصلاح: النافذة ما زالت مفتوحة)
    late = Student("t2")
    _NOW[0] = start + timedelta(minutes=61, seconds=1)
    r_late = db.start_exam_attempt(late, eid)
    check("F: بدء محاولة بعد (start_at + المدة) مسموح — مدة كاملة من بدء المحاولة",
          r_late["deadline"] == r_late["attempt_started_at"] + timedelta(minutes=60) + GRACE)

    # منع تجاوز المؤقت: تسليم مباشر بلا محاولة بعد (start_at + المدة) يُرفض
    eid_d = db.save_exam(True, {
        "title": "مباشر", "grade": "first_secondary", "is_published": True, "access_mode": "public",
        "duration_minutes": 30, "start_at": now_fn() - timedelta(hours=2),
        "end_at": now_fn() + timedelta(hours=6),
        "questions": [{"question_text": "س", "type": "mcq", "correct_answer": "A"}],
    })
    fresh = Student("t2b")
    ok, msg = expect_policy_error(db, db.submit_exam, fresh, eid_d, {}, contains="انتهى وقت")
    check("F: تسليم مباشر بلا محاولة بعد (start_at + المدة) يُرفض (لا تجاوز)", ok, msg)

    # امتحان duration بدون start_at: المهلة تبدأ من المحاولة (لا وقت مفتوح من الخادم)
    eid2 = db.save_exam(True, {
        "title": "بدون فاتحة", "grade": "first_secondary", "is_published": True, "access_mode": "public",
        "duration_minutes": 30, "start_at": None, "end_at": now_fn() + timedelta(hours=6),
        "questions": [{"question_text": "س", "type": "mcq", "correct_answer": "A"}],
    })
    st2 = Student("t3")
    r3 = db.start_exam_attempt(st2, eid2)
    check("F: duration بدون start_at — المهلة من بدء المحاولة",
          r3["deadline"] == r3["attempt_started_at"] + timedelta(minutes=30) + GRACE)
    _NOW[0] += timedelta(minutes=31, seconds=1)
    ok, msg = expect_policy_error(db, db.submit_exam, st2, eid2, {}, contains="انتهى وقت")
    check("F: التسليم بعد 31:01 دقيقة (خارج المهلة 30+1) مرفوض", ok, msg)

    # end_at صارم بلا مهلة — حتى لو مدة الطالب لم تنتهِ بعد
    _NOW[0] = datetime(2026, 11, 22, 10, 0, tzinfo=timezone.utc)
    eid3 = db.save_exam(True, {
        "title": "إغلاق صارم", "grade": "first_secondary", "is_published": True, "access_mode": "public",
        "duration_minutes": 60, "start_at": None, "end_at": now_fn() + timedelta(minutes=10),
        "questions": [{"question_text": "س", "type": "mcq", "correct_answer": "A"}],
    })
    st3 = Student("t4")
    db.start_exam_attempt(st3, eid3)
    _NOW[0] += timedelta(minutes=10, seconds=1)
    ok, msg = expect_policy_error(db, db.submit_exam, st3, eid3, {}, contains="انتهى وقت")
    check("F: end_at صارم بدون مهلة (نفس السلوك القديم)", ok, msg)
    # الطالب الذي بدأ قرب end_at: موعده يُقص عند end_at نفسه
    eid4 = db.save_exam(True, {
        "title": "قص عند end_at", "grade": "first_secondary", "is_published": True, "access_mode": "public",
        "duration_minutes": 60, "start_at": None, "end_at": now_fn() + timedelta(minutes=5),
        "questions": [{"question_text": "س", "type": "mcq", "correct_answer": "A"}],
    })
    st4 = Student("t5")
    r4 = db.start_exam_attempt(st4, eid4)
    check("F: من بدأ قرب end_at — موعده يُقص عند end_at لا يتعداه",
          r4["deadline"] == db.exams[eid4].end_at)


def scenario_g_regression() -> None:
    """Test G — عدم التراجع: الطلب المباشر بدون تسجيل دخول، وحجز الوجهات القديمة."""
    db = DB()
    eid = db.save_exam(True, {
        "title": "reg", "grade": "first_secondary", "is_published": True, "access_mode": "subscribers",
        "questions": [{"question_text": "س", "type": "mcq", "correct_answer": "A"}],
    })
    # admin لا يستطيع التسليم (نفس السلوك القديم)
    admin = Student("adm", role="admin")
    ok, msg = expect_policy_error(db, db.submit_exam, admin, eid, {}, contains="غير مسموح")
    check("G: الحسابات غير الطالبية ممنوعة من التسليم (كما كان)", ok, msg)
    # غير منشور → ممنوع
    db.exams[eid].is_published = False
    st = Student("g1", confirmed_booking=True)
    ok, msg = expect_policy_error(db, db.get_exam_questions, st, eid, contains="غير منشور")
    check("G: الامتحان غير المنشور ممنوع (كما كان)", ok, msg)
    # المراجعة بعد التسليم متاحة في أي وقت حتى لو انتهى الوقت/أُلغي النشر
    db.exams[eid].is_published = True
    db.exams[eid].end_at = now_fn() - timedelta(hours=1)
    _NOW[0] += timedelta(minutes=1)
    # (نبدأ محاولة قبل انتهاء الوقت)
    db.exams[eid].end_at = now_fn() + timedelta(hours=1)
    db.start_exam_attempt(st, eid)
    db.get_exam_questions(st, eid)
    db.submit_exam(st, eid, {})
    db.exams[eid].end_at = now_fn() - timedelta(seconds=1)
    _NOW[0] += timedelta(minutes=1)
    check("G: مراجعة الأسئلة بعد التسليم متاحة حتى بعد إغلاق النافذة",
          len(db.get_exam_questions(st, eid)) == 1)


def main() -> int:
    scenarios = [
        ("Test A — امتحان عام", scenario_a_public_exam),
        ("Test B — امتحان خاص بالمشتركين", scenario_b_subscribers_exam),
        ("Test C — تغيير الخصوصية", scenario_c_access_mode_changes),
        ("Test D — عدة طلاب", scenario_d_multiple_students),
        ("Test E — سلامة البيانات", scenario_e_data_integrity),
        ("Test F — المؤقت والتسليم", scenario_f_timer),
        ("Test G — عدم التراجع", scenario_g_regression),
    ]
    for name, fn in scenarios:
        print(f"\n=== {name} ===")
        before_f, before_p = len(FAILED), len(PASSED)
        try:
            fn()
        except Exception as exc:  # noqa: BLE001
            FAILED.append(f"{name}: استثناء غير متوقع {type(exc).__name__}: {exc}")
        new = PASSED[before_p:]
        for p in new:
            print(f"  ✔ {p}")
        for f in FAILED[before_f:]:
            print(f"  ✖ {f}")
        if not new and before_f == len(FAILED):
            print("  (لا فحوصات)")

    print(f"\n{'=' * 50}")
    print(f"النتيجة: {len(PASSED)} ناجح / {len(FAILED)} فاشل")
    if FAILED:
        print("\nالفاشل:")
        for f in FAILED:
            print(f"  ✖ {f}")
        return 1
    print("جميع فحوصات محاكاة السياسة ناجحة ✔")
    return 0


if __name__ == "__main__":
    sys.exit(main())
