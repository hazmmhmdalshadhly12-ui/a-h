import { useState, useCallback, useRef, useEffect } from 'react';
import AIButton from './AIButton.jsx';
import ChatWindow from './ChatWindow.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { sendChatMessage } from '../../services/aiService.js';

/** ودجت الشات العائم — ظاهر في كل الصفحات */
export default function VisionAI() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();
  const openedOnce = useRef(false);

  // فتح رسالة ترحيب أول مرة بيحصل فيها تسجيل دخول
  useEffect(() => {
    if (profile && !openedOnce.current) {
      openedOnce.current = true;
      setOpen(true);
    }
  }, [profile]);

  const send = useCallback(
    async (text) => {
      const userMsg = { role: 'user', content: text };
      const history = [...messages, userMsg];
      setMessages(history);
      setLoading(true);

      const res = await sendChatMessage(history, {
        studentId: profile?.id,
        grade: profile?.grade
      });

      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply || 'عفواً، حصلت مشكلة.' }]);
      setLoading(false);
    },
    [messages, profile]
  );

  return (
    <div className="fixed bottom-5 left-4 z-50 flex flex-col items-end gap-3">
      {open && <ChatWindow messages={messages} loading={loading} onClose={() => setOpen(false)} onSend={send} />}
      <AIButton open={open} onClick={() => setOpen((v) => !v)} />
    </div>
  );
}