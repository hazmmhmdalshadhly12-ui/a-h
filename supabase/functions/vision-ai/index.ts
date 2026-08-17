// vision-ai — الشات بوت الذكي
// بيستقبل رسائل المستخدم، بيجيب بيانات حية من قاعدة البيانات (service role)
// وبيقوله على موديل ذكاء اصطناعي (OpenAI-compatible) — الـ API Key مخفي هنا على السيرفر.
//
// الأمان (إصلاح فحص الثغرات):
//   * لازم المستخدم يكون مسجل دخول (JWT صالح) — وإلا 401
//   * CORS مقتصر على نطاقات الموقع فقط
//   * رسائل لا نهائية من غير تسجيل = حرق رصيد OpenAI بلا حدود (اتقفل)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { buildSystemPrompt } from "./academy-context.ts";

// النطاقات المسموحة بس — الموقع نفسه + GitHub Pages كاحتياط
const ALLOWED_ORIGINS = new Set([
  "https://hazem.blog",
  "https://hazmmhmdalshadhly12-ui.github.io",
  "http://localhost:5173",
  "http://localhost:4173",
]);

function getOrigin(req) {
  return req.headers.get("origin") || req.headers.get("Origin") || "";
}

function corsHeaders(req) {
  const origin = getOrigin(req);
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
    // ---- 1) التحقق من هوية المتصل (JWT) ----
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) {
      return json(req, { reply: "يجب تسجيل الدخول أولاً." }, 401);
    }

    // نستخدم عميل ANON + توكن المستخدم عشان نتأكد إن الـ JWT صالح ولمن هو
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData?.user) {
      console.error("vision-ai auth failed:", userError?.message ?? "no user");
      return json(req, { reply: "جلسة غير صالحة — سجل دخولك تاني." }, 401);
    }
    const userId = userData.user.id;

    const body = await req.json();
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const context = body?.context ?? {};

    if (messages.length === 0) {
      return json(req, { reply: "أرسل رسالة أولاً." }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // الـ context بييجي من المستخدم — نثبّت studentId من الـ JWT نفسه،
    // مش من body، عشان منسمحش لأي حد يقرا كأنه حد تاني.
    const safeContext = {
      ...context,
      studentId: userId,
    };

    const systemPrompt = await buildSystemPrompt(supabase, safeContext);

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return json(req, {
        reply:
          "لسه مش متظبط مفتاح الذكاء الاصطناعي. روح لـ Supabase → Edge Functions → Secrets وضيف OPENAI_API_KEY.",
      });
    }

    const model = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";
    const baseUrl = Deno.env.get("OPENAI_BASE_URL") || "https://api.openai.com/v1";

    const payload = {
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      temperature: 0.6,
      max_tokens: 600,
    };

    const aiRes = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const aiJson = await aiRes.json();

    if (!aiRes.ok) {
      console.error("AI error:", aiJson);
      return json(req, { reply: "حصلت مشكلة في الموديل، جرب كمان شوية." }, 502);
    }

    const reply =
      aiJson?.choices?.[0]?.message?.content?.trim() ||
      "عذراً، مقدرتش أصوغ إجابة دلوقتي.";

    return json(req, { reply });
  } catch (err) {
    console.error("vision-ai error:", err);
    return json(req, { reply: "حصلت مشكلة في الاتصال، جرب كمان شوية." }, 500);
  }
});