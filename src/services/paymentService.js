import { supabase } from '../lib/supabaseClient.js';

export async function fetchPaymentMethods() {
  const { data, error } = await supabase.from('payment_methods').select('*').eq('is_active', true).order('order_index');
  return { data: data || [], error };
}
export async function fetchAllPaymentMethods() {
  return supabase.from('payment_methods').select('*').order('order_index');
}
export async function createPaymentMethod(payload) {
  return supabase.from('payment_methods').insert(payload).select().single();
}
export async function updatePaymentMethod(id, payload) {
  return supabase.from('payment_methods').update(payload).eq('id', id).select().single();
}
export async function deletePaymentMethod(id) {
  return supabase.from('payment_methods').delete().eq('id', id);
}
