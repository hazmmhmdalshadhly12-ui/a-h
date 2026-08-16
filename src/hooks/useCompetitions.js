import { useState, useEffect, useCallback } from 'react';
import { fetchCompetitions } from '../services/competitionService.js';

export function useCompetitions(grade) {
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await fetchCompetitions(grade ? { grade } : {});
    setCompetitions(data || []);
    setLoading(false);
  }, [grade]);

  useEffect(() => {
    load();
  }, [load]);

  return { competitions, loading, reload: load };
}