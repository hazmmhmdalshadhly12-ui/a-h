// submit-exam — تسليم امتحان من خلال Edge Function
// بيمرر JWT بتاع المستخدم عشان قاعدة البيانات تعرف مين اللي بيقدم
// وتطبّق الـ unique constraint: محاولة واحدة فقط لكل طالب لكل امتحان.
//
// الأمان: CORS مقتصر على نطاقات الموقع فقط (إصلاح فحص الثغرات)
// + لا نعيد رسائل أخطاء خام أبدًا (منع تسريب معلومات قاعدة البيانات).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const ALLOWED_ORIGINS = new Set([
  "https://hazem.blog",
  "https://hazmmhmdalshadhly12-ui.github.io",
  "http://localhost:5173",
  "http://localhost:4173",
]);

// رسائل آمنة مقصودة من دوال قاعدة البيانات — بس اللي دي بتوصل للمستخدم
const SAFE_MSGS = [
  "محاولة واحدة",
  "غير مصرح",
  "غير مسموح",
  "يجب تسجيل الدخول",
  "غير موجود",
  "لم يبدأ",
  "انتهى وقت",
  "ليس لصفك",
  "غير منشور",
  "تعذر",
];

function safeError(msg) {
  const m = msg || "";
  if (SAFE_MSGS.some((s) => m.includes(s))) return m;
  return "حدث خطأ أثناء تنفيذ الطلب، حاول مرة أخرى";
}

function corsHeaders(req) {
  const origin = req.headers.get("origin") || req.headers.get("Origin") || "";
  const headers = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  if (ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function json(req, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const { p_exam_id, p_answers } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader ?? "" } } }
    );

    const { data, error } = await supabase.rpc("submit_exam", {
      p_exam_id,
      p_answers,
    });

    if (error) {
      console.error("submit-exam rpc error:", error);
      return json(req, { error: safeError(error.message) }, 400);
    }

    return json(req, { data });
  } catch (err) {
    console.error("submit-exam error:", err);
    return json(req, { error: "حدث خطأ أثناء تنفيذ الطلب، حاول مرة أخرى" }, 500);
  }
});