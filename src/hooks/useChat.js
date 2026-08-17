import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth.js';
import {
  getOrCreateConversation,
  fetchMessages,
  sendMessage,
  markConversationRead,
  fetchAllConversations,
  deleteMessage
} from '../services/chatService.js';

/** شات الطالب مع المعلم — بيدير المحادثة الوحيدة بتاعته */
export function useStudentChat() {
  const { profile } = useAuth();
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  // تأسيس المحادثة مرة واحدة
  useEffect(() => {
    if (!profile?.id) return;
    let active = true;
    setLoading(true);
    getOrCreateConversation()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setError(error);
          setLoading(false);
          return;
        }
        setConversationId(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [profile?.id]);

  // جلب الرسائل + تحديث دوري
  const load = useCallback(async () => {
    if (!conversationId) return;
    const { data } = await fetchMessages(conversationId);
    if (Array.isArray(data)) setMessages(data);
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    load();
    markConversationRead(conversationId);
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [conversationId, load]);

  const send = useCallback(
    async (text) => {
      const body = String(text || '').trim();
      if (!body || !conversationId) return { error: { message: 'الرسالة فاضية' } };
      setSending(true);
      const { data, error } = await sendMessage(conversationId, profile.id, body);
      setSending(false);
      if (!error && data) {
        setMessages((prev) => [...prev, data]);
      }
      return { data, error };
    },
    [conversationId, profile?.id]
  );

  const remove = useCallback(
    async (messageId) => {
      const { error } = await deleteMessage(messageId);
      if (!error) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      }
      return { error };
    },
    []
  );

  return { conversationId, messages, loading, sending, error, send, remove, reload: load };
}

/** شات الأدمن — كل المحادثات مع الطلاب + الرسائل */
export function useAdminChat() {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const loadedConv = useRef(null);

  const loadConversations = useCallback(async () => {
    const { data } = await fetchAllConversations();
    if (Array.isArray(data)) setConversations(data);
  }, []);

  useEffect(() => {
    loadConversations().finally(() => setLoading(false));
    const interval = setInterval(loadConversations, 10000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  // لما نختار محادثة نجيب رسائلها
  useEffect(() => {
    if (!activeId) return;
    loadedConv.current = activeId;
    fetchMessages(activeId).then(({ data }) => {
      if (loadedConv.current === activeId && Array.isArray(data)) setMessages(data);
    });
    markConversationRead(activeId);
    const interval = setInterval(() => {
      fetchMessages(activeId).then(({ data }) => {
        if (loadedConv.current === activeId && Array.isArray(data)) setMessages(data);
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [activeId]);

  const send = useCallback(
    async (text) => {
      const body = String(text || '').trim();
      if (!body || !activeId) return { error: { message: 'الرسالة فاضية' } };
      setSending(true);
      const { data, error } = await sendMessage(activeId, profile.id, body);
      setSending(false);
      if (!error && data) {
        setMessages((prev) => [...prev, data]);
        loadConversations();
      }
      return { data, error };
    },
    [activeId, profile?.id, loadConversations]
  );

  const remove = useCallback(
    async (messageId) => {
      const { error } = await deleteMessage(messageId);
      if (!error) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      }
      return { error };
    },
    []
  );

  return { conversations, activeId, setActiveId, messages, loading, sending, send, remove };
}
