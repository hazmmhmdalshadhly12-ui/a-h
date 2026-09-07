import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // استخراج البيانات من الطلب
    const { bookingData, studentData } = await req.json();

    if (!bookingData || !studentData) {
      return new Response(JSON.stringify({ error: "Missing booking or student data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // جلب إيميل المستر من admin_settings
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

    // تجهيز محتوى الإيميل
    const monthNames = [
      "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
      "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
    ];

    const gradeLabels: Record<string, string> = {
      first_secondary: "الصف الأول الثانوي",
      second_secondary: "الصف الثاني الثانوي",
      professional: "الكورس الاحترافي",
    };

    const monthStr = bookingData.month
      ? `${monthNames[new Date(bookingData.month + "-01").getMonth()]} ${new Date(bookingData.month + "-01").getFullYear()}`
      : "غير محدد";

    const subject = `📚 طلب حجز جديد - ${studentData.full_name}`;
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
          .btn { display: inline-block; background: #f5b741; color: #0b1020; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📚 طلب حجز جديد</h1>
          <p>وصل طلب حجز جديد من طالب في الأكاديمية</p>
        </div>
        <div class="content">
          <div class="field">
            <div class="label">👤 اسم الطالب</div>
            <div class="value">${studentData.full_name}</div>
          </div>
          <div class="field">
            <div class="label">📱 رقم الطالب</div>
            <div class="value">${studentData.phone}</div>
          </div>
          <div class="field">
            <div class="label">👨‍👦 رقم ولي الأمر</div>
            <div class="value">${studentData.parent_phone || "غير محدد"}</div>
          </div>
          <div class="field">
            <div class="label">🎓 الصف</div>
            <div class="value">${gradeLabels[bookingData.grade] || bookingData.grade}</div>
          </div>
          <div class="field">
            <div class="label">📅 الشهر المطلوب</div>
            <div class="value">${monthStr}</div>
          </div>
          ${bookingData.notes ? `
          <div class="field">
            <div class="label">📝 ملاحظات الطالب</div>
            <div class="value">${bookingData.notes}</div>
          </div>
          ` : ""}
          <div class="field">
            <div class="label">💳 رقم التحويل</div>
            <div class="value" style="font-family: monospace; direction: ltr;">${bookingData.transfer_number}</div>
          </div>
        </div>
        <div class="footer">
          <p>Vision Academy — نظام إدارة الحجوزات</p>
          <p>هذه رسالة آلية، لا داعي للرد عليها.</p>
        </div>
      </body>
      </html>
    `;

    // إرسال الإيميل عبر Resend (أو أي خدمة SMTP)
    // ملاحظة: محتاج تضيف RESEND_API_KEY في Supabase Edge Function Secrets
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
        return new Response(JSON.stringify({ error: "Failed to send email via Resend" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // Fallback: لو مفيش Resend، نطبع في اللوجز (للاختبار)
      console.log("Email would be sent to:", adminEmail);
      console.log("Subject:", subject);
      console.log("HTML:", html);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-booking-email error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});