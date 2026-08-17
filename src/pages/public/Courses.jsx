import { useEffect, useState } from 'react';
import PublicLayout from '../../components/layout/PublicLayout.jsx';
import CoursePreview from '../../components/academy/CoursePreview.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import { fetchPublicCourses } from '../../services/courseService.js';
import { GRADES_OPTIONS } from '../../config/constants.js';

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicCourses().then(({ data }) => {
      setCourses(data || []);
      setLoading(false);
    });
  }, []);

  const groups = GRADES_OPTIONS.map((g) => ({
    ...g,
    list: courses.filter((c) => c.grade === g.value)
  })).filter((g) => g.list.length > 0);

  return (
    <PublicLayout>
      <section className="container-site py-12">
        <div className="mb-10">
          <p className="font-mono text-xs text-stream">&lt;curriculum /&gt;</p>
          <h1 className="mt-2 font-display text-4xl font-black">الكورسات</h1>
          <p className="mt-3 max-w-2xl text-muted">
            الفيديوهات الكاملة والمحتوى التفاعلي متاح للطلاب المسجلين فقط. سجّل دخولك وادخل على
            الكورسات الخاصة بصفك من لوحة الطالب.
          </p>
        </div>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-56" />
            ))}
          </div>
        ) : (
          <div className="space-y-12">
            {groups.map((group) => (
                <div key={group.value}>
                  <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold text-paper">
                    <span className="h-2 w-2 rounded-full bg-signal" />
                    {group.label}
                  </h2>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {group.list.map((c) => (
                      <CoursePreview key={c.id} course={c} />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>
    </PublicLayout>
  );
}