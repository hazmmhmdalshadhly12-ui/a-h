import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAdminChat } from '../../hooks/useChat.js';
import AdminHeader from '../../components/admin/AdminHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Icon from '../../components/ui/Icon.jsx';
import Button from '../../components/ui/Button.jsx';
import ChatBubble from '../../components/chat/ChatBubble.jsx';
import ChatComposer from '../../components/chat/ChatComposer.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { GRADES } from '../../config/site.js';
import { getFriendlyError } from '../../utils/errors.js';
import { useToast } from '../../components/ui/Toast.jsx';
import { cn } from '../../lib/utils.js';
import { fetchAllStudents } from '../../services/profileService.js';

/** تقسيم الرسائل لمجموعات حسب اليوم — زي واتساب */
function groupByDay(messages) {
  const groups = [];
  const map = new Map();
  for (const m of messages) {
    const key = new Date(m.created_at || Date.now()).toDateString();
    if (!map.has(key)) {
      map.set(key, []);
      groups.push({ key, items: map.get(key) });
    }
    map.get(key).push(m);
  }
  return groups;
}

function DayDivider({ label }) {
  return (
    <div className="my-2 flex justify-center">
      <span className="rounded-full bg-ink-800 px-3 py-1 text-[11px] text-muted">{label}</span>
    </div>
  );
}

export default function Chat() {
  const [searchParams, setSearchParams] = useSearchParams();
  const studentParam = searchParams.get('student') || null;
  const { profile } = useAuth();
  const toast = useToast();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const { conversations, activeId, setActiveId, messages, loading, sending, send, remove, openStudentChat, openError } =
    useAdminChat(studentParam);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeId]);

  // لما نفتح محادثة من ملف الطالب ننضف الـ query param عشان الـ useAdminChat ميعملش open تاني
  useEffect(() => {
    if (studentParam && activeId) {
      setSearchParams({}, { replace: true });
    }
  }, [studentParam, activeId, setSearchParams]);

  const active = conversations.find((c) => c.id === activeId);

  const handleSend = async (text) => {
    const { error: sendError } = await send(text);
    if (sendError) toast.error(getFriendlyError(sendError, 'فشل إرسال الرسالة، حاول مرة أخرى'));
  };

  const handleDelete = async (messageId) => {
    const { error: delError } = await remove(messageId);
    if (delError) toast.error(getFriendlyError(delError, 'فشل حذف الرسالة'));
  };

  const openChat = async (studentId) => {
    if (!studentId) return;
    const { error } = await openStudentChat(studentId);
    if (error) toast.error(getFriendlyError(error, 'فشل فتح المحادثة'));
  };

  const togglePicker = async () => {
    const next = !pickerOpen;
    setPickerOpen(next);
    if (next && students.length === 0) {
      setStudentsLoading(true);
      const { data, error } = await fetchAllStudents();
      setStudents(Array.isArray(data) ? data : []);
      if (error) toast.error(getFriendlyError(error, 'فشل تحميل الطلاب'));
      setStudentsLoading(false);
    }
  };

  const startChatWith = (student) => {
    setPickerOpen(false);
    setStudentSearch('');
    openChat(student.id);
  };

  const filteredStudents = students.filter(
    (s) =>
      !studentSearch ||
      s.full_name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.phone?.includes(studentSearch)
  );

  const dayLabel = (key) => {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (key === today) return 'اليوم';
    if (key === yesterday) return 'أمس';
    return new Date(key).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const groups = groupByDay(messages);

  return (
    <div className="space-y-6">
      <AdminHeader title="الشات مع الطلاب" subtitle="اسأل وأجب على أسئلة الطلاب من مكان واحد — زي واتساب" />

      {openError && (
        <p className="rounded-lens border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          {getFriendlyError(openError, 'فشل فتح المحادثة مع الطالب')}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* قائمة المحادثات */}
        <Card className="overflow-hidden lg:col-span-1">
          <div className="flex items-center justify-between gap-2 border-b border-ink-600 px-4 py-3">
            <p className="font-display text-sm font-bold text-paper">المحادثات ({conversations.length})</p>
            <Button size="sm" variant="secondary" onClick={togglePicker}>
              <Icon name="plus" className="h-3.5 w-3.5" /> محادثة جديدة
            </Button>
          </div>

          {pickerOpen && (
            <div className="border-b border-ink-700 bg-ink-800/60 p-3">
              <input
                type="search"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="ابحث بالاسم أو رقم الهاتف..."
                className="focus-ring w-full rounded-lens border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-paper placeholder:text-muted"
              />
              <div className="mt-2 max-h-48 overflow-y-auto">
                {studentsLoading ? (
                  <div className="space-y-1.5">
                    <Skeleton className="h-9" />
                    <Skeleton className="h-9" />
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <p className="py-3 text-center text-xs text-muted">لا يوجد طلاب مطابقون.</p>
                ) : (
                  filteredStudents.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => startChatWith(s)}
                      className="focus-ring flex w-full items-center gap-2.5 rounded-lens px-2 py-2 text-right transition hover:bg-ink-700/60"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-signal/15 font-display text-xs font-bold text-signal">
                        {(s.full_name || 'ط').slice(0, 1)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-paper">{s.full_name || 'طالب'}</span>
                        <span className="block truncate text-[11px] text-muted">
                          {GRADES[s.grade] || ''}
                          {s.phone ? ` • ${s.phone}` : ''}
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
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
                description="رسائل الطلاب هتظهر هنا، أو ابدأ شات مع أي طالب من ملفه."
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
                    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-signal/15 font-display font-bold text-signal">
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
                {active.student && (
                  <button
                    type="button"
                    onClick={() => openChat(active.student.id)}
                    className="focus-ring mr-auto rounded-lens border border-ink-600 px-3 py-1.5 text-xs font-semibold text-signal transition hover:bg-ink-800"
                  >
                    بدء محادثة مع الطالب
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {messages.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted">لا توجد رسائل بعد — ابدأ الرد.</p>
                ) : (
                  groups.map((g) => (
                    <div key={g.key}>
                      <DayDivider label={dayLabel(g.key)} />
                      <div className="space-y-3">
                        {g.items.map((m) => (
                          <ChatBubble
                            key={m.id}
                            message={m}
                            mine={m.sender_id === profile?.id}
                            deletable
                            onDelete={handleDelete}
                          />
                        ))}
                      </div>
                    </div>
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