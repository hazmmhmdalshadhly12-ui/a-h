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

export function useCourse(courseId) {
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courseId) return;
    let active = true;
    fetchCourseById(courseId).then(({ data }) => {
      if (active) {
        setCourse(data);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [courseId]);

  return { course, loading };
}