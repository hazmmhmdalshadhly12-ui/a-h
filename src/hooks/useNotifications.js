import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth.js';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from '../services/notificationService.js';

export function useNotifications() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await fetchNotifications(profile?.id);
    setNotifications(data || []);
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markRead = useCallback(async (id) => {
    await markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  }, []);

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead(profile?.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }, [profile?.id]);

  return { notifications, loading, unreadCount, markRead, markAllRead, reload: load };
}