import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://hazem.blog",
  "https://www.hazem.blog",
  "https://hazmmhmdalshadhly12-ui.github.io",
  "http://localhost:5173",
  "http://localhost:4173",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  if (ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function esc(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function safeError(): string {
  return "حدث خطأ أثناء إرسال الإشعار — حاول مرة أخرى";
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // مصادقة: لازم JWT صالح
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "غير مصرح" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const bodyText = await req.text();
    if (bodyText.length > 10000) {
      return new Response(JSON.stringify({ error: "البيانات كبيرة جداً" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsed = JSON.parse(bodyText);
    const { bookingData, studentData } = parsed;

    if (!bookingData || !studentData) {
      return new Response(JSON.stringify({ error: "بيانات ناقصة" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // تحقق من حجم الحقول وحدودها
    const notes = String(bookingData.notes || "").slice(0, 500);
    const fullName = String(studentData.full_name || "").slice(0, 100);
    const phone = String(studentData.phone || "").slice(0, 20).replace(/[^0-9+]/g, "");
    const parentPhone = String(studentData.parent_phone || "").slice(0, 20).replace(/[^0-9+]/g, "");
    const transferNumber = String(bookingData.transfer_number || "").slice(0, 20).replace(/[^0-9+]/g, "");
    const gradeRaw = String(bookingData.grade || "");
    const allowedGrades = ["first_secondary", "second_secondary", "professional"];
    const grade = allowedGrades.includes(gradeRaw) ? gradeRaw : "غير محدد";
    const month = String(bookingData.month || "").slice(0, 7);

    // تحقق من المستخدم عبر JWT
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "غير مصرح" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: settings } = await supabase
      .from("admin_settings")
      .select("notification_email")
      .eq("id", 1)
      .maybeSingle();

    const adminEmail = settings?.notification_email;
    if (!adminEmail) {
      return new Response(
        JSON.stringify({ error: "Admin notification email not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const monthNames = [
      "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
      "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
    ];

    const gradeLabels: Record<string, string> = {
      first_secondary: "الصف الأول الثانوي",
      second_secondary: "الصف الثاني الثانوي",
      professional: "الكورس الاحترافي",
    };

    const monthStr = month
      ? `${monthNames[new Date(month + "-01").getMonth()]} ${new Date(month + "-01").getFullYear()}`
      : "غير محدد";

    const subject = `طلب حجز جديد - ${esc(fullName)}`;
    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f5b741 0%, #5eead4 100%); color: #0b1020; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px; }
          .field { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-right: 4px solid #f5b741; }
          .label { font-weight: 600; color: #666; font-size: 14px; }
          .value { font-size: 16px; color: #333; }
          .footer { text-align: center; margin-top: 20px; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>طلب حجز جديد</h1>
          <p>وصل طلب حجز جديد من طالب في الأكاديمية</p>
        </div>
        <div class="content">
          <div class="field">
            <div class="label">اسم الطالب</div>
            <div class="value">${esc(fullName)}</div>
          </div>
          <div class="field">
            <div class="label">رقم الطالب</div>
            <div class="value">${esc(phone)}</div>
          </div>
          <div class="field">
            <div class="label">رقم ولي الأمر</div>
            <div class="value">${esc(parentPhone) || "غير محدد"}</div>
          </div>
          <div class="field">
            <div class="label">الصف</div>
            <div class="value">${esc(gradeLabels[grade] || grade)}</div>
          </div>
          <div class="field">
            <div class="label">الشهر المطلوب</div>
            <div class="value">${esc(monthStr)}</div>
          </div>
          ${notes ? `
          <div class="field">
            <div class="label">ملاحظات الطالب</div>
            <div class="value">${esc(notes)}</div>
          </div>
          ` : ""}
          <div class="field">
            <div class="label">رقم التحويل</div>
            <div class="value" style="font-family: monospace; direction: ltr;">${esc(transferNumber)}</div>
          </div>
        </div>
        <div class="footer">
          <p>Vision Academy — نظام إدارة الحجوزات</p>
          <p>هذه رسالة آلية، لا داعي للرد عليها.</p>
        </div>
      </body>
      </html>
    `;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Vision Academy <onboarding@resend.dev>",
          to: [adminEmail],
          subject,
          html,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("Resend error:", err);
        return new Response(JSON.stringify({ error: safeError() }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      console.log("Email would be sent to:", adminEmail);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-booking-email error:", err);
    return new Response(JSON.stringify({ error: safeError() }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
