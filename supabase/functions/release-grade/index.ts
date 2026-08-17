// release-grade — نشر درجة للطالب
// بيستقبل JWT بتاع الأدمن، وبينادي الدالة publish_grade على قاعدة البيانات
// اللي بتتأكد من صلاحية الأدمن جواها قبل أي تحديث.
//
// الأمان: CORS مقتصر على نطاقات الموقع فقط + لا نعيد أخطاء خام
// (منع تسريب معلومات قاعدة البيانات).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const ALLOWED_ORIGINS = new Set([
  "https://hazem.blog",
  "https://hazmmhmdalshadhly12-ui.github.io",
  "http://localhost:5173",
  "http://localhost:4173",
]);

function safeError(msg) {
  const m = msg || "";
  return m.includes("غير مصرح") ? m : "حدث خطأ أثناء تنفيذ الطلب، حاول مرة أخرى";
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
    const { p_submission_id, p_exam_id } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader ?? "" } } }
    );

    if (p_submission_id) {
      const { error } = await supabase.rpc("publish_grade", { p_submission_id });
      if (error) {
        console.error("release-grade rpc error:", error);
        return json(req, { error: safeError(error.message) }, 400);
      }
    } else if (p_exam_id) {
      const { error } = await supabase.rpc("publish_exam_grades", { p_exam_id });
      if (error) {
        console.error("release-grade rpc error:", error);
        return json(req, { error: safeError(error.message) }, 400);
      }
    } else {
      return json(req, { error: "أرسل p_submission_id أو p_exam_id" }, 400);
    }

    return json(req, { ok: true });
  } catch (err) {
    console.error("release-grade error:", err);
    return json(req, { error: "حدث خطأ أثناء تنفيذ الطلب، حاول مرة أخرى" }, 500);
  }
});