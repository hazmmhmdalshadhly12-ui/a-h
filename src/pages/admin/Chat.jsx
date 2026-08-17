import { useEffect, useRef } from 'react';
import { useAdminChat } from '../../hooks/useChat.js';
import AdminHeader from '../../components/admin/AdminHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Icon from '../../components/ui/Icon.jsx';
import ChatBubble from '../../components/chat/ChatBubble.jsx';
import ChatComposer from '../../components/chat/ChatComposer.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { GRADES } from '../../config/site.js';
import { getFriendlyError } from '../../utils/errors.js';
import { useToast } from '../../components/ui/Toast.jsx';
import { cn } from '../../lib/utils.js';

export default function Chat() {
  const { profile } = useAuth();
  const toast = useToast();
  const { conversations, activeId, setActiveId, messages, loading, sending, send } = useAdminChat();
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeId]);

  const active = conversations.find((c) => c.id === activeId);

  const handleSend = async (text) => {
    const { error: sendError } = await send(text);
    if (sendError) toast.error(getFriendlyError(sendError, 'فشل إرسال الرسالة، حاول مرة أخرى'));
  };

  return (
    <div className="space-y-6">
      <AdminHeader title="الشات مع الطلاب" subtitle="اسأل وأجب على أسئلة الطلاب من مكان واحد" />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* قائمة المحادثات */}
        <Card className="overflow-hidden lg:col-span-1">
          <div className="border-b border-ink-600 px-4 py-3">
            <p className="font-display text-sm font-bold text-paper">المحادثات ({conversations.length})</p>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="space-y-2 p-4">
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </div>
            ) : conversations.length === 0 ? (
              <EmptyState
                icon={<Icon name="chat" className="h-6 w-6" />}
                title="لا توجد محادثات"
                description="رسائل الطلاب هتظهر هنا."
                className="py-10"
              />
            ) : (
              conversations.map((c) => {
                const student = c.student;
                const isActive = c.id === activeId;
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    className={cn(
                      'focus-ring flex w-full items-center gap-3 border-b border-ink-700/50 px-4 py-3 text-right transition hover:bg-ink-800/60',
                      isActive && 'bg-signal/10'
                    )}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-signal/15 font-display font-bold text-signal">
                      {(student?.full_name || 'ط').slice(0, 1)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-paper">
                        {student?.full_name || 'طالب'}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {GRADES[student?.grade] || ''}
                        {student?.phone ? ` • ${student.phone}` : ''}
                      </span>
                    </span>
                    <span className="text-xs text-muted">
                      {new Date(c.last_message_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {/* نافذة المحادثة */}
        <Card className="flex flex-col overflow-hidden lg:col-span-2">
          {!activeId || !active ? (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-2 p-8 text-center">
              <p className="font-display text-lg font-bold text-paper">اختر محادثة</p>
              <p className="max-w-sm text-sm text-muted">من القائمة جنبك عشان تشوف الرسائل وترد عليها.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-ink-600 bg-ink-800 px-4 py-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-signal/15 font-display font-bold text-signal">
                  {(active.student?.full_name || 'ط').slice(0, 1)}
                </span>
                <div>
                  <p className="font-display text-sm font-bold text-paper">{active.student?.full_name || 'طالب'}</p>
                  <p className="text-xs text-muted">
                    {GRADES[active.student?.grade] || ''}
                    {active.student?.phone ? ` • ${active.student.phone}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted">لا توجد رسائل بعد — ابدأ الرد.</p>
                ) : (
                  messages.map((m) => (
                    <ChatBubble key={m.id} message={m} mine={m.sender_id === profile?.id} />
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              <ChatComposer onSend={handleSend} disabled={sending} placeholder="اكتب ردك للطالب..." />
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
