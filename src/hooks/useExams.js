import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth.js';
import { fetchExamsForStudent, fetchExamById } from '../services/examService.js';
import { fetchSubmissionForExam } from '../services/submissionService.js';

export function useExams() {
  const { profile } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) {
      setExams([]);
      setLoading(false);
      return;
    }
    const { data } = await fetchExamsForStudent(profile.id, profile.grade);
    setExams(data || []);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  return { exams, loading, reload: load };
}

export function useExam(examId) {
  const { profile } = useAuth();
  const [exam, setExam] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!examId || !profile) return;
    let active = true;

    setLoading(true);

    // جلب الامتحان والتسليم بشكل منفصل لمنع توقف الصفحة إذا لم يكن هناك تسليم سابق
    Promise.allSettled([
      fetchExamById(examId),
      fetchSubmissionForExam(profile.id, examId)
    ]).then(([examRes, subRes]) => {
      if (!active) return;

      if (examRes.status === 'fulfilled') {
        setExam(examRes.value?.data || examRes.value);
      }

      if (subRes.status === 'fulfilled') {
        setSubmission(subRes.value?.data || subRes.value);
      } else {
        setSubmission(null); // لا يوجد تسليم سابق بعد
      }

      setLoading(false);
    }).catch((err) => {
      console.error("Error loading exam:", err);
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [examId, profile]);

  return { exam, submission, loading };
}
