import { supabase } from '../lib/supabaseClient.js';

export async function fetchBookingsForStudent(studentId) {
  if (!studentId) return { data: [], error: null };
  return supabase.from('bookings').select('*').eq('student_id', studentId).order('created_at', { ascending: false });
}

/** حجز شهري — الاسم + موبايل الطالب + ولي الأمر + الصف + الشهر المطلوب */
export async function createBooking({ studentId, fullName, phone, parentPhone, grade, month, notes }) {
  return supabase
    .from('bookings')
    .insert({
      student_id: studentId,
      full_name: fullName,
      phone,
      parent_phone: parentPhone || null,
      grade: grade || 'first_secondary',
      month: month || null,
      notes: notes || null
    })
    .select()
    .single();
}

// ===== الأدمن =====

export async function fetchAllBookings({ status } = {}) {
  let q = supabase.from('bookings').select('*, profiles(id, full_name, phone, grade)').order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  return q;
}

export async function updateBookingStatus(bookingId, status) {
  return supabase.from('bookings').update({ status }).eq('id', bookingId).select().single();
}

export async function updateBooking(bookingId, updates) {
  return supabase.from('bookings').update(updates).eq('id', bookingId).select().single();
}

export async function deleteBooking(bookingId) {
  return supabase.from('bookings').delete().eq('id', bookingId);
}