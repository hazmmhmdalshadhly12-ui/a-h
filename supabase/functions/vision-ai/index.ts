// vision-ai — الشات بوت الذكي
// بيستقبل رسائل المستخدم، بيجيب بيانات حية من قاعدة البيانات (service role)
// وبيقوله على موديل ذكاء اصطناعي (OpenAI-compatible) — الـ API Key مخفي هنا على السيرفر.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { buildSystemPrompt } from "./academy-context.ts";

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
    const body = await req.json();
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const context = body?.context ?? {};

    if (messages.length === 0) {
      return json({ reply: "أرسل رسالة أولاً." }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const systemPrompt = await buildSystemPrompt(supabase, context);

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return json({
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
      return json({ reply: "حصلت مشكلة في الموديل، جرب كمان شوية." }, 502);
    }

    const reply =
      aiJson?.choices?.[0]?.message?.content?.trim() ||
      "عذراً، مقدرتش أصوغ إجابة دلوقتي.";

    return json({ reply });
  } catch (err) {
    console.error("vision-ai error:", err);
    return json({ reply: "حصلت مشكلة في الاتصال، جرب كمان شوية." }, 500);
  }
});

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}