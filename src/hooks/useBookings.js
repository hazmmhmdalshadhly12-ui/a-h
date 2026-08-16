import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth.js';
import { fetchBookingsForStudent, createBooking } from '../services/bookingService.js';

export function useBookings() {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await fetchBookingsForStudent(profile?.id);
    setBookings(data || []);
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const requestBooking = useCallback(
    async (payload) => {
      if (!profile) return { error: { message: 'لازم تسجل دخول أولاً' } };
      return createBooking({ ...payload, studentId: profile.id });
    },
    [profile]
  );

  return { bookings, loading, reload: load, requestBooking };
}