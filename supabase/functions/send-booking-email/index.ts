import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as nodemailer from "https://esm.sh/nodemailer@6.9";

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
    const { bookingData, studentData } = await req.json();

    if (!bookingData || !studentData) {
      return new Response(JSON.stringify({ error: "Missing booking or student data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Gmail SMTP Config
    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailAppPass = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailAppPass) {
      return new Response(
        JSON.stringify({ error: "Gmail credentials not configured in Secrets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // true for 465, false for 587
      auth: {
        user: gmailUser,
        pass: gmailAppPass,
      },
    });

    // Verify connection
    try {
      await transporter.verify();
    } catch (verifyErr) {
      console.error("Gmail SMTP verify failed:", verifyErr);
      return new Response(JSON.stringify({ error: "Gmail SMTP authentication failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Email content
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

    // Send email
    const info = await transporter.sendMail({
      from: `"Vision Academy" <${gmailUser}>`,
      to: adminEmail,
      subject,
      html,
    });

    console.log("Email sent:", info.messageId);

    return new Response(JSON.stringify({ success: true, messageId: info.messageId }), {
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
