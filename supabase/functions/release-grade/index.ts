// release-grade — نشر درجة للطالب
// بيستقبل JWT بتاع الأدمن، وبينادي الدالة publish_grade على قاعدة البيانات
// اللي بتتأكد من صلاحية الأدمن جواها قبل أي تحديث.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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
      if (error) return json({ error: error.message }, 400);
    } else if (p_exam_id) {
      const { error } = await supabase.rpc("publish_exam_grades", { p_exam_id });
      if (error) return json({ error: error.message }, 400);
    } else {
      return json({ error: "أرسل p_submission_id أو p_exam_id" }, 400);
    }

    return json({ ok: true });
  } catch (err) {
    return json({ error: String(err.message || err) }, 500);
  }
});

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}