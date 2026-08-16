// submit-exam — تسليم امتحان من خلال Edge Function
// بيمرر JWT بتاع المستخدم عشان قاعدة البيانات تعرف مين اللي بيقدم
// وتطبّق الـ unique constraint: محاولة واحدة فقط لكل طالب لكل امتحان.

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
      return json({ error: error.message }, 400);
    }

    return json({ data });
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