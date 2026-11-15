-- 0002 · Funciones auxiliares (esquema private) + RLS en todas las tablas
grant usage on schema private to authenticated;

create or replace function private.is_coach_of(athlete uuid) returns boolean
language sql security definer stable set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = athlete and p.coach_id = (select auth.uid()));
$$;
create or replace function private.my_coach() returns uuid
language sql security definer stable set search_path = '' as $$
  select p.coach_id from public.profiles p where p.id = (select auth.uid());
$$;
create or replace function private.block_athlete(p_block uuid) returns uuid
language sql security definer stable set search_path = '' as $$
  select b.athlete_id from public.training_blocks b where b.id = p_block;
$$;
create or replace function private.week_athlete(p_week uuid) returns uuid
language sql security definer stable set search_path = '' as $$
  select b.athlete_id from public.training_weeks w join public.training_blocks b on b.id = w.block_id where w.id = p_week;
$$;
create or replace function private.day_athlete(p_day uuid) returns uuid
language sql security definer stable set search_path = '' as $$
  select b.athlete_id from public.training_days d
    join public.training_weeks w on w.id = d.week_id
    join public.training_blocks b on b.id = w.block_id where d.id = p_day;
$$;
create or replace function private.session_athlete(p_session uuid) returns uuid
language sql security definer stable set search_path = '' as $$
  select s.athlete_id from public.workout_sessions s where s.id = p_session;
$$;
create or replace function private.version_athlete(p_version uuid) returns uuid
language sql security definer stable set search_path = '' as $$
  select v.athlete_id from public.diet_versions v where v.id = p_version;
$$;
create or replace function private.meal_athlete(p_meal uuid) returns uuid
language sql security definer stable set search_path = '' as $$
  select v.athlete_id from public.diet_meals m join public.diet_versions v on v.id = m.version_id where m.id = p_meal;
$$;
create or replace function private.option_athlete(p_option uuid) returns uuid
language sql security definer stable set search_path = '' as $$
  select v.athlete_id from public.diet_options o
    join public.diet_meals m on m.id = o.meal_id
    join public.diet_versions v on v.id = m.version_id where o.id = p_option;
$$;
create or replace function private.item_athlete(p_item uuid) returns uuid
language sql security definer stable set search_path = '' as $$
  select v.athlete_id from public.diet_items i
    join public.diet_options o on o.id = i.option_id
    join public.diet_meals m on m.id = o.meal_id
    join public.diet_versions v on v.id = m.version_id where i.id = p_item;
$$;
create or replace function private.checkin_athlete(p_checkin uuid) returns uuid
language sql security definer stable set search_path = '' as $$
  select c.athlete_id from public.checkins c where c.id = p_checkin;
$$;
create or replace function private.section_coach(p_section uuid) returns uuid
language sql security definer stable set search_path = '' as $$
  select s.coach_id from public.checkin_sections s where s.id = p_section;
$$;
create or replace function private.preset_coach(p_preset uuid) returns uuid
language sql security definer stable set search_path = '' as $$
  select p.coach_id from public.program_presets p where p.id = p_preset;
$$;
create or replace function private.pday_coach(p_day uuid) returns uuid
language sql security definer stable set search_path = '' as $$
  select p.coach_id from public.preset_days d join public.program_presets p on p.id = d.preset_id where d.id = p_day;
$$;

grant execute on all functions in schema private to authenticated;

-- Activar RLS en todas las tablas
do $$ declare t text; begin
  foreach t in array array['profiles','exercises','training_blocks','training_weeks','training_days','training_exercises',
    'program_presets','preset_days','preset_exercises','workout_sessions','set_logs','foods','diet_versions','diet_meals',
    'diet_options','diet_items','diet_equivalences','macro_logs','checkin_sections','checkin_fields','athlete_checkin_fields',
    'checkins','checkin_answers','feedbacks','energy_goals','energy_logs','supplements','accessories','accessory_checks']
  loop execute format('alter table public.%I enable row level security', t); end loop;
end $$;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or coach_id = (select auth.uid()) or id = (select private.my_coach()));
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy profiles_update_coach on public.profiles for update to authenticated
  using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));

-- Tablas con athlete_id directo: coach gestiona + alumno lee propio
do $$ declare t text; begin
  foreach t in array array['training_blocks','diet_versions','checkins','feedbacks','workout_sessions','macro_logs',
    'energy_goals','energy_logs','supplements','accessories','accessory_checks','athlete_checkin_fields']
  loop
    execute format('create policy %I on public.%I for all to authenticated using ((select private.is_coach_of(athlete_id))) with check ((select private.is_coach_of(athlete_id)))', t||'_coach', t);
    execute format('create policy %I on public.%I for select to authenticated using (athlete_id = (select auth.uid()))', t||'_athlete_read', t);
  end loop;
end $$;

-- Tablas hijas: resolver alumno por el padre
do $$ declare r record; begin
  for r in select * from (values
    ('training_weeks','private.block_athlete(block_id)'),
    ('training_days','private.week_athlete(week_id)'),
    ('training_exercises','private.day_athlete(day_id)'),
    ('diet_meals','private.version_athlete(version_id)'),
    ('diet_options','private.meal_athlete(meal_id)'),
    ('diet_items','private.option_athlete(option_id)'),
    ('diet_equivalences','private.item_athlete(item_id)'),
    ('set_logs','private.session_athlete(session_id)'),
    ('checkin_answers','private.checkin_athlete(checkin_id)')) as v(t, f)
  loop
    execute format('create policy %I on public.%I for all to authenticated using ((select private.is_coach_of(%s))) with check ((select private.is_coach_of(%s)))', r.t||'_coach', r.t, r.f, r.f);
    execute format('create policy %I on public.%I for select to authenticated using (%s = (select auth.uid()))', r.t||'_athlete_read', r.t, r.f);
  end loop;
end $$;

-- Escrituras del alumno
create policy workout_sessions_athlete_ins on public.workout_sessions for insert to authenticated
  with check (athlete_id = (select auth.uid()) and private.day_athlete(day_id) = (select auth.uid()));
create policy workout_sessions_athlete_upd on public.workout_sessions for update to authenticated
  using (athlete_id = (select auth.uid())) with check (athlete_id = (select auth.uid()));
create policy workout_sessions_athlete_del on public.workout_sessions for delete to authenticated
  using (athlete_id = (select auth.uid()) and status = 'in_progress');

create policy set_logs_athlete_write on public.set_logs for all to authenticated
  using (private.session_athlete(session_id) = (select auth.uid()))
  with check (private.session_athlete(session_id) = (select auth.uid()));

create policy checkins_athlete_ins on public.checkins for insert to authenticated
  with check (athlete_id = (select auth.uid()) and status in ('in_progress','submitted'));
create policy checkins_athlete_upd on public.checkins for update to authenticated
  using (athlete_id = (select auth.uid()) and status <> 'reviewed')
  with check (athlete_id = (select auth.uid()) and status in ('in_progress','submitted'));

create policy checkin_answers_athlete_write on public.checkin_answers for all to authenticated
  using (private.checkin_athlete(checkin_id) = (select auth.uid()))
  with check (private.checkin_athlete(checkin_id) = (select auth.uid()));

create policy macro_logs_athlete_ins on public.macro_logs for insert to authenticated
  with check (athlete_id = (select auth.uid()));
create policy macro_logs_athlete_del on public.macro_logs for delete to authenticated
  using (athlete_id = (select auth.uid()));

create policy energy_logs_athlete_ins on public.energy_logs for insert to authenticated
  with check (athlete_id = (select auth.uid()));
create policy energy_logs_athlete_upd on public.energy_logs for update to authenticated
  using (athlete_id = (select auth.uid())) with check (athlete_id = (select auth.uid()));

create policy accessory_checks_athlete_ins on public.accessory_checks for insert to authenticated
  with check (athlete_id = (select auth.uid()));
create policy accessory_checks_athlete_del on public.accessory_checks for delete to authenticated
  using (athlete_id = (select auth.uid()));

-- Recursos del coach: coach gestiona lo suyo; alumno lee los de su coach
create policy exercises_coach on public.exercises for all to authenticated
  using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));
create policy exercises_athlete_read on public.exercises for select to authenticated
  using (coach_id = (select private.my_coach()));
create policy foods_coach on public.foods for all to authenticated
  using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));
create policy foods_athlete_read on public.foods for select to authenticated
  using (coach_id = (select private.my_coach()));
create policy checkin_sections_coach on public.checkin_sections for all to authenticated
  using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));
create policy checkin_sections_athlete_read on public.checkin_sections for select to authenticated
  using (coach_id = (select private.my_coach()));
create policy checkin_fields_coach on public.checkin_fields for all to authenticated
  using (private.section_coach(section_id) = (select auth.uid())) with check (private.section_coach(section_id) = (select auth.uid()));
create policy checkin_fields_athlete_read on public.checkin_fields for select to authenticated
  using (private.section_coach(section_id) = (select private.my_coach()));
create policy program_presets_coach on public.program_presets for all to authenticated
  using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));
create policy preset_days_coach on public.preset_days for all to authenticated
  using (private.preset_coach(preset_id) = (select auth.uid())) with check (private.preset_coach(preset_id) = (select auth.uid()));
create policy preset_exercises_coach on public.preset_exercises for all to authenticated
  using (private.pday_coach(day_id) = (select auth.uid())) with check (private.pday_coach(day_id) = (select auth.uid()));
