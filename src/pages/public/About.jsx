import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout.jsx';
import VisionCore from '../../components/vision/VisionCore.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import { SITE } from '../../config/site.js';

export default function About() {
  return (
    <PublicLayout>
      <section className="container-site py-12">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 flex justify-center">
            <VisionCore size={120} />
          </div>
          <p className="font-mono text-xs text-stream">&lt;about /&gt;</p>
          <h1 className="mt-2 font-display text-4xl font-black">عن Vision Academy</h1>
          <p className="mt-5 text-lg leading-relaxed text-muted">{SITE.description}</p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-3">
          <Card>
            <h3 className="font-display text-lg font-bold text-signal">الرؤية</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              تكوين جيل من طلاب الثانوية يفكر بالمنطق ويحل المشكلات برمجياً، مش مجرد حفظ مصطلحات.
            </p>
          </Card>
          <Card>
            <h3 className="font-display text-lg font-bold text-stream">الرسالة</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              منهج مبسط ومنظم لمادة البرمجة، بمتابعة مستمرة عبر الامتحانات والمسابقات.
            </p>
          </Card>
          <Card>
            <h3 className="font-display text-lg font-bold text-signal">القيم</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              وضوح، تطبيق عملي، منافسة شريفة، ومتابعة شخصية لكل طالب.
            </p>
          </Card>
        </div>

        <div className="mx-auto mt-12 max-w-3xl rounded-lens border border-ink-600 bg-ink-800/60 p-8 text-center">
          <h2 className="font-display text-2xl font-black">{SITE.instructor.title}</h2>
          <p className="mt-3 text-muted">
            المادة بتتقدم بمتابعة مباشرة من {SITE.instructor.name} — مراجعة الحجوزات، تصحيح الامتحانات
            المقالية، ونشر الدرجات يتم يدوياً لضمان دقة التقييم.
          </p>
          <div className="mt-6">
            <Link to="/register">
              <Button>سجّل معنا</Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}