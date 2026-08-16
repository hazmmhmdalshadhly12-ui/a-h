import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import PublicLayout from '../../components/layout/PublicLayout.jsx';
import VisionCore from '../../components/vision/VisionCore.jsx';
import Button from '../../components/ui/Button.jsx';
import Icon from '../../components/ui/Icon.jsx';
import Card from '../../components/ui/Card.jsx';
import { SITE } from '../../config/site.js';

const FEATURES = [
  {
    icon: 'courses',
    title: 'كورسات مسجّلة',
    desc: 'فيديوهات شرح كاملة لمادة البرمجة مقسمة حسب الصف والمادة، بمتابعة وترتيب واضح.'
  },
  {
    icon: 'exams',
    title: 'امتحانات تفاعلية',
    desc: 'امتحانات أونلاين بمحاولة واحدة، تصحيح آلي للموضوعي ومراجعة يدوية للمقالي.'
  },
  {
    icon: 'bookings',
    title: 'حجوزات الحصص',
    desc: 'احجز حصة أونلاين واعرف حالتها فوراً: قيد المراجعة، مؤكدة، أو مرفوضة.'
  },
  {
    icon: 'competitions',
    title: 'مسابقات دورية',
    desc: 'مسابقات برمجية لطلاب الأول والثاني الثانوي بشهادات تقدير للفائزين.'
  }
];

const STEPS = [
  { n: '01', title: 'سجّل حسابك', desc: 'بالاسم والموبايل والصف، في أقل من دقيقة.' },
  { n: '02', title: 'شاهد الكورسات', desc: 'ابدا من أول درس وامشي بالترتيب.' },
  { n: '03', title: 'حل الامتحانات', desc: 'اختبر نفسك واعرف درجتك بعد مراجعة المستر.' },
  { n: '04', title: 'احجز وشارك', desc: 'احجز حصتك وشارك في المسابقات.' }
];

export default function Home() {
  const { session } = useAuth();
  const ctaPath = session ? '/student/dashboard' : '/register';

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="container-site grid items-center gap-10 py-16 lg:grid-cols-2 lg:py-24">
          <div className="animate-fade-up">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-stream/30 bg-stream/10 px-4 py-1.5 font-mono text-xs text-stream">
              &lt;cs /&gt; programming academy
            </p>
            <h1 className="font-display text-4xl font-black leading-[1.15] sm:text-5xl lg:text-6xl">
              رؤية برمجية
              <br />
              <span className="text-gradient">لمستقبل ثانوي</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              {SITE.instructor.title}. كورسات، امتحانات، حجوزات، ومسابقات — كل اللي محتاجه الطالب
              يبني أساس برمجة قوي من الصف الأول الثانوي.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to={ctaPath}>
                <Button size="lg">
                  {session ? 'ادخل لوحتك' : 'ابدأ مجاناً الآن'}
                  <Icon name="chevronLeft" className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/courses">
                <Button size="lg" variant="secondary">
                  استكشف الكورسات
                </Button>
              </Link>
            </div>
            <p className="mt-6 flex items-center gap-2 text-sm text-muted">
              <Icon name="check" className="h-4 w-4 text-success" />
              امتحانات بمحاولة واحدة — قفل من قاعدة البيانات نفسها
            </p>
          </div>

          <div className="relative hidden justify-center lg:flex">
            <div className="absolute h-72 w-72 rounded-full bg-signal/15 blur-[90px]" />
            <VisionCore size={380} className="drop-shadow-[0_0_40px_rgba(245,183,65,0.25)]" />
          </div>
        </div>
      </section>

      {/* مميزات */}
      <section className="container-site py-14">
        <div className="mb-10 text-center">
          <p className="font-mono text-xs text-stream">&lt;features /&gt;</p>
          <h2 className="mt-2 font-display text-3xl font-black">ليه Vision Academy؟</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <Card key={f.title} hover>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lens bg-signal/15 text-signal">
                <Icon name={f.icon} className="h-6 w-6" />
              </div>
              <h3 className="font-display text-lg font-bold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* إزاي تشتغل؟ */}
      <section className="border-y border-ink-600/60 bg-ink-900/40">
        <div className="container-site py-14">
          <div className="mb-10 text-center">
            <p className="font-mono text-xs text-stream">&lt;workflow /&gt;</p>
            <h2 className="mt-2 font-display text-3xl font-black">إزاي تبدأ؟</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="relative rounded-lens border border-ink-600 bg-ink-800/60 p-5">
                <span className="font-mono text-3xl font-bold text-signal/60">{s.n}</span>
                <h3 className="mt-2 font-display text-lg font-bold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-site py-16">
        <div className="card-panel relative overflow-hidden rounded-lens p-8 text-center sm:p-12">
          <div className="absolute -left-10 -top-10 opacity-10">
            <VisionCore size={220} />
          </div>
          <h2 className="font-display text-3xl font-black sm:text-4xl">جاهز تبدأ رحلتك البرمجية؟</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            سجل حسابك الآن وافتح الكورسات والامتحانات الخاصة بصفك، مجاناً.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/register">
              <Button size="lg">تسجيل حساب جديد</Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="secondary">تواصل معنا</Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}