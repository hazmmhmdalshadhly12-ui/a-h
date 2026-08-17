import { useEffect, useRef } from 'react';
import { useStudentChat } from '../../hooks/useChat.js';
import Card from '../../components/ui/Card.jsx';
import ChatBubble from '../../components/chat/ChatBubble.jsx';
import ChatComposer from '../../components/chat/ChatComposer.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { getFriendlyError } from '../../utils/errors.js';
import { useToast } from '../../components/ui/Toast.jsx';

export default function Chat() {
  const { profile } = useAuth();
  const toast = useToast();
  const { messages, loading, sending, error, send, remove } = useStudentChat();
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (text) => {
    const { error: sendError } = await send(text);
    if (sendError) toast.error(getFriendlyError(sendError, 'فشل إرسال الرسالة، حاول مرة أخرى'));
  };

  const handleDelete = async (messageId) => {
    const { error: delError } = await remove(messageId);
    if (delError) toast.error(getFriendlyError(delError, 'فشل حذف الرسالة'));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="font-display text-2xl font-black">تواصل مع المعلم</h1>
        <p className="mt-1 text-sm text-muted">
          أي سؤال أو استفسار — ابعت رسالة وهيرد عليك المعلم. كل رسائلك سريعة ومباشرة.
        </p>
      </div>

      <Card className="flex h-[60vh] flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-ink-600 bg-ink-800 px-4 py-3">
          <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-stream/15 font-display font-bold text-stream">
            م
            <span className="absolute -bottom-0.5 -left-0.5 h-3 w-3 rounded-full border-2 border-ink-800 bg-success" />
          </span>
          <div>
            <p className="font-display text-sm font-bold text-paper">المعلم</p>
            <p className="text-xs text-muted">متصل — يرد على رسائلك</p>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-12" />
              <Skeleton className="h-12 w-2/3" />
              <Skeleton className="h-12" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <p className="font-display text-lg font-bold text-paper">ابدأ المحادثة 👋</p>
              <p className="max-w-sm text-sm text-muted">
                أهلاً {profile?.full_name || 'بيك'}! اسأل المعلم عن أي حاجة — الكورسات، الامتحانات،
                الاشتراك الشهري، أو أي استفسار.
              </p>
            </div>
          ) : (
            messages.map((m) => (
              <ChatBubble
                key={m.id}
                message={m}
                mine={m.sender_id === profile?.id}
                deletable={m.sender_id === profile?.id}
                onDelete={handleDelete}
              />
            ))
          )}

          {error && (
            <p className="rounded-lens border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
              {getFriendlyError(error, 'حصلت مشكلة في تحميل المحادثة')}
            </p>
          )}
          <div ref={bottomRef} />
        </div>

        <ChatComposer onSend={handleSend} disabled={sending} placeholder="اكتب رسالتك للمعلم..." />
      </Card>
    </div>
  );
}
