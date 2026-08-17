-- ============================================================
-- 015_chat.sql
-- نظام الشات بين الطالب والمعلم (المستر/الأدمن)
--
-- التصميم:
--   * conversations — محادثة واحدة لكل طالب مع المعلم
--   * messages — رسائل جوه المحادثة (من الطالب أو من المعلم)
--   * المعلم بيبان على أنه "الأدمن" اللي بيعمل مراجعة الحجوزات
--   * كل طالب بيقدر يفتح محادثة واحدة مع المعلم ويراسله
--   * المعلم (أدمن) بيشوف كل المحادثات ويرد عليها
-- ============================================================

-- ---------- جداول الشات ----------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  -- محادثة واحدة لكل طالب
  unique (student_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(btrim(body)) > 0),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index messages_conversation_idx on public.messages (conversation_id, created_at asc);
create index conversations_teacher_idx on public.conversations (teacher_id, last_message_at desc);

-- ---------- RLS ----------
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

grant select, insert on public.conversations to authenticated;
grant select, insert, update on public.messages to authenticated;

-- المحادثة: الطالب صاحبها أو الأدمن
create policy "conversations: own or admin"
  on public.conversations for select to authenticated
  using (student_id = auth.uid() or public.is_admin());

create policy "conversations: student creates own"
  on public.conversations for insert to authenticated
  with check (
    public.is_student()
    and student_id = auth.uid()
    and teacher_id in (select id from public.profiles where role = 'admin')
  );

-- الرسائل: الطالب شايف رسائل محادثته أو الأدمن شايف الكل
create policy "messages: read own conversation or admin"
  on public.messages for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.student_id = auth.uid()
    )
  );

-- الإرسال: الطالب يرسل في محادثته، والأدمن يرسل في أي محادثة
create policy "messages: send in own conversation or admin"
  on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.student_id = auth.uid() or public.is_admin())
    )
  );

-- القراءة: الطالب يعلّم رسائل المعلم كمقروءة، والأدمن يعلّم رسائل الطلاب كمقروءة
create policy "messages: mark read in own conversation or admin"
  on public.messages for update to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.student_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.student_id = auth.uid()
    )
  );

-- منع تعديل الرسائل: التحديث مسموح بس لعمود is_read
-- (عشان الطالب ميقدرش يعدّل نص/مرسل رسالة — حتى جوه محادثته)
create or replace function public.messages_guard_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.body is distinct from old.body
     or new.sender_id is distinct from old.sender_id
     or new.conversation_id is distinct from old.conversation_id
     or new.id is distinct from old.id then
    raise exception 'غير مسموح بتعديل الرسائل';
  end if;
  return new;
end;
$$;

drop trigger if exists messages_guard_update on public.messages;
create trigger messages_guard_update
  before update on public.messages
  for each row execute procedure public.messages_guard_update();

-- ---------- آخر رسالة للمحادثة ----------
create or replace function public.touch_conversation()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  update public.conversations
  set last_message_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute procedure public.touch_conversation();

-- ---------- إشعار المعلم برسالة جديدة من طالب ----------
create or replace function public.notify_chat_message()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_teacher uuid;
  v_student uuid;
  v_teacher_profile public.profiles%rowtype;
begin
  select c.teacher_id, c.student_id into v_teacher, v_student
  from public.conversations c where c.id = new.conversation_id;

  select * into v_teacher_profile from public.profiles where id = v_teacher;

  -- الطالب بيبعت للمعلم → إشعار للمعلم
  if new.sender_id = v_student then
    insert into public.notifications (student_id, title, body)
    values (v_teacher, 'رسالة جديدة من طالب', 'وصلتك رسالة جديدة من طالب في الشات.');
  end if;

  -- المعلم بيرد على الطالب → إشعار للطالب
  if new.sender_id = v_teacher then
    insert into public.notifications (student_id, title, body)
    values (v_student, 'رسالة جديدة من المعلم', 'رد عليك المعلم في الشات.');
  end if;

  return new;
end;
$$;

drop trigger if exists messages_notify_chat on public.messages;
create trigger messages_notify_chat
  after insert on public.messages
  for each row execute procedure public.notify_chat_message();

-- ---------- جلب أو إنشاء محادثة الطالب مع المعلم ----------
create or replace function public.get_or_create_conversation()
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_teacher uuid;
  v_conv uuid;
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  -- أول أدمن في النظام هو المعلم
  select id into v_teacher from public.profiles where role = 'admin' order by created_at asc limit 1;
  if v_teacher is null then
    raise exception 'لم يتم تحديد معلم بعد';
  end if;

  select id into v_conv from public.conversations where student_id = auth.uid();
  if v_conv is not null then
    return v_conv;
  end if;

  insert into public.conversations (student_id, teacher_id)
  values (auth.uid(), v_teacher)
  on conflict (student_id) do nothing
  returning id into v_conv;

  if v_conv is null then
    select id into v_conv from public.conversations where student_id = auth.uid();
  end if;

  return v_conv;
end;
$$;

grant execute on function public.get_or_create_conversation() to authenticated;