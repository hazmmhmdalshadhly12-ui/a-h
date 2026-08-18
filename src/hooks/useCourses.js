import { useState, useEffect, useCallback } from 'react';
import { fetchCourses, fetchStudentCourses, fetchCourseById } from '../services/courseService.js';

/** كورسات الطالب — مع حالة القفل (accessible) حسب اشتراكه */
export function useStudentCourses(grade) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await fetchStudentCourses(grade);
    setCourses(data || []);
    setError(error);
    setLoading(false);
  }, [grade]);

  useEffect(() => {
    load();
  }, [load]);

  return { courses, loading, error, reload: load };
}

export function useCourses(grade) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await fetchCourses(grade ? { grade } : {});
    setCourses(data || []);
    setError(error);
    setLoading(false);
  }, [grade]);

  useEffect(() => {
    load();
  }, [load]);

  return { courses, loading, error, reload: load };
}

export function useCourse(courseId, grade) {
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courseId) return;
    let active = true;

    // للطلاب: بنجيب الكورسات كاملة عبر get_student_courses (يدعم الاحترافي لكل الصفوف
    // مع السعر وحالة accessibility حتى لو مش مشترك في الكورس)
    if (grade) {
      fetchStudentCourses(grade).then(({ data }) => {
        if (active) {
          const found = Array.isArray(data) ? data.find((c) => (c.course_id || c.id) === courseId) : null;
          setCourse(found || null);
          setLoading(false);
        }
      });
      return () => {
        active = false;
      };
    }

    fetchCourseById(courseId).then(({ data }) => {
      if (active) {
        setCourse(data);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [courseId, grade]);

  return { course, loading };
}