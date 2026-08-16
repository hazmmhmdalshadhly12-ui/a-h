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
    let active = true;

    // لسه البروفايل محمّلش (auth loading) → نستنى وما نعلّقش الـ loading للأبد
    if (!examId || !profile?.id) {
      setLoading(false);
      return () => {
        active = false;
      };
    }

    // جلب الامتحان والتسليم بشكل مستقل:
    // لو جلب الـ submission فشل مش هيلغي الامتحان (يظهر "الامتحان غير موجود" خطأ)
    const pid = profile.id;

    fetchExamById(examId)
      .then((examRes) => {
        if (!active) return;
        if (examRes.error) {
          console.error('[useExam] fetchExamById error:', examRes.error);
          setExam(null);
          return;
        }
        setExam(examRes.data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    fetchSubmissionForExam(pid, examId)
      .then((subRes) => {
        if (!active) return;
        if (subRes.error) {
          console.error('[useExam] fetchSubmissionForExam error:', subRes.error);
          setSubmission(null);
          return;
        }
        setSubmission(subRes.data);
      })
      .catch((err) => {
        if (!active) return;
        console.error('[useExam] fetchSubmissionForExam threw:', err);
        setSubmission(null);
      });

    return () => {
      active = false;
    };
  }, [examId, profile?.id]);

  return { exam, submission, loading };
}