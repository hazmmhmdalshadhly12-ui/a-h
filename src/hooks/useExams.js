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
    Promise.all([fetchExamById(examId), fetchSubmissionForExam(profile.id, examId)]).then(
      ([examRes, subRes]) => {
        if (!active) return;
        setExam(examRes.data);
        setSubmission(subRes.data);
        setLoading(false);
      }
    );
    return () => {
      active = false;
    };
  }, [examId, profile]);

  return { exam, submission, loading };
}