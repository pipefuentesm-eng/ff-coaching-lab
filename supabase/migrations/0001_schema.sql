-- 0001 · Esquema base de FF Coaching Lab
create extension if not exists pgcrypto;
create schema if not exists private;
create type public.user_role as enum ('coach','athlete');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'athlete',
  full_name text not null,
  phone text,
  birth_date date,
  coach_id uuid references public.profiles(id),
  coach_slug text unique,
  active boolean not null default true,
  checkin_day smallint check (checkin_day between 0 and 6),
  water_goal_l numeric,
  access_from date,
  created_at timestamptz not null default now()
);

-- Entrenamiento
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  name text not null, muscle_group text not null, video_url text,
  created_at timestamptz default now());

create table public.training_blocks (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  status text not null default 'active' check (status in ('active','finished')),
  created_at timestamptz default now());
-- Un solo bloque activo por alumno (protege contra doble clic)
create unique index training_blocks_one_active on public.training_blocks (athlete_id) where status = 'active';

create table public.training_weeks (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.training_blocks(id) on delete cascade,
  week_number int not null, starts_on date,
  unique (block_id, week_number));

create table public.training_days (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.training_weeks(id) on delete cascade,
  name text not null,
  weekday smallint check (weekday between 0 and 6),
  position int not null default 0);

create table public.training_exercises (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.training_days(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  position int not null default 0,
  sets int not null,
  reps_min int, reps_max int, rir numeric,
  rest_min_min numeric, rest_max_min numeric,
  rest_pause_reps int default 0, ar_set text, tempo text,
  block_note text, week_note text);

-- Presets
create table public.program_presets (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  name text not null, description text,
  created_at timestamptz not null default now());

create table public.preset_days (
  id uuid primary key default gen_random_uuid(),
  preset_id uuid not null references public.program_presets(id) on delete cascade,
  name text not null,
  weekday smallint check (weekday between 0 and 6),
  position int not null default 0);

create table public.preset_exercises (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.preset_days(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  position int not null default 0, sets int not null,
  reps_min int, reps_max int, rir numeric,
  rest_min_min numeric, rest_max_min numeric,
  rest_pause_reps int default 0, ar_set text, tempo text, block_note text);

-- Logger
create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  day_id uuid not null references public.training_days(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'in_progress' check (status in ('in_progress','completed','skipped')),
  survey jsonb, note text);
create unique index workout_sessions_athlete_day on public.workout_sessions (athlete_id, day_id);

create table public.set_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  training_exercise_id uuid not null references public.training_exercises(id) on delete cascade,
  set_number int not null,
  weight_kg numeric, reps int, rir numeric, note text,
  unique (session_id, training_exercise_id, set_number));

-- Nutrición
create table public.foods (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  unit text not null default 'g' check (unit in ('g','u')),
  kcal_per_unit numeric not null,
  protein_per_unit numeric not null default 0,
  carbs_per_unit numeric not null default 0,
  fat_per_unit numeric not null default 0);

create table public.diet_versions (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  valid_from date not null,
  day_type text not null default 'base' check (day_type in ('base','entreno','descanso')),
  plan_notes jsonb default '{}'::jsonb,
  created_at timestamptz default now());

create table public.diet_meals (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.diet_versions(id) on delete cascade,
  position int not null, name text not null);

create table public.diet_options (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.diet_meals(id) on delete cascade,
  option_number int not null default 1);

create table public.diet_items (
  id uuid primary key default gen_random_uuid(),
  option_id uuid not null references public.diet_options(id) on delete cascade,
  food_id uuid references public.foods(id) on delete set null,
  label text, amount numeric not null, note text,
  position int not null default 0);

create table public.diet_equivalences (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.diet_items(id) on delete cascade,
  food_id uuid references public.foods(id) on delete set null,
  label text, amount numeric not null, kcal numeric);

create table public.macro_logs (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  meal_id uuid references public.diet_meals(id) on delete set null,
  log_date date not null,
  food_id uuid references public.foods(id) on delete set null,
  amount numeric check (amount is null or amount > 0),
  label text, protein numeric, carbs numeric, fat numeric,
  created_at timestamptz not null default now(),
  check ((food_id is not null and amount is not null) or (protein is not null or carbs is not null or fat is not null)));

-- Check-ins
create type public.checkin_field_type as enum
  ('number','time_of_day','boolean_detail','enum','enum_detail','scale_1_5','scale_1_10',
   'long_text','text','macros','cardio','workout_select','time_duration','nap_detail');

create table public.checkin_sections (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  name text not null, position int not null default 0);

create table public.checkin_fields (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.checkin_sections(id) on delete cascade,
  label text not null, help text,
  field_type public.checkin_field_type not null,
  unit text, options jsonb,
  weekly boolean not null default false,
  default_on boolean not null default true,
  position int not null default 0);

create table public.athlete_checkin_fields (
  athlete_id uuid references public.profiles(id) on delete cascade,
  field_id uuid references public.checkin_fields(id) on delete cascade,
  enabled boolean not null default true,
  primary key (athlete_id, field_id));

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  week_number int not null,   -- formato AAAASS (año ISO * 100 + semana ISO), ej. 202647
  status text not null default 'in_progress' check (status in ('in_progress','submitted','reviewed')),
  submitted_at timestamptz, reviewed_at timestamptz,
  unique (athlete_id, week_number));

create table public.checkin_answers (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid not null references public.checkins(id) on delete cascade,
  field_id uuid not null references public.checkin_fields(id),
  entry_date date,
  value jsonb not null);
create unique index checkin_answers_uniq on public.checkin_answers (checkin_id, field_id, entry_date) nulls not distinct;

create table public.feedbacks (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  checkin_id uuid references public.checkins(id) on delete set null,
  loom_url text not null, transcript text,
  created_at timestamptz default now());

-- Extras
create table public.energy_goals (
  athlete_id uuid primary key references public.profiles(id) on delete cascade,
  steps_goal int, cardio_min_week int, notes text,
  updated_at timestamptz not null default now());

create table public.energy_logs (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  log_date date not null, steps int, cardio_min int,
  unique (athlete_id, log_date));

create table public.supplements (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  name text not null, dose text, timing text,
  kind text not null default 'required' check (kind in ('required','suggested')),
  why text, notes text, position int not null default 0);

create table public.accessories (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  name text not null, note text, position int not null default 0);

create table public.accessory_checks (
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  accessory_id uuid not null references public.accessories(id) on delete cascade,
  primary key (athlete_id, accessory_id));

-- Índices en FK
create index on public.profiles (coach_id);
create index on public.exercises (coach_id);
create index on public.training_blocks (athlete_id);
create index on public.training_weeks (block_id);
create index on public.training_days (week_id);
create index on public.training_exercises (day_id);
create index on public.training_exercises (exercise_id);
create index on public.program_presets (coach_id);
create index on public.preset_days (preset_id);
create index on public.preset_exercises (day_id);
create index on public.preset_exercises (exercise_id);
create index on public.workout_sessions (day_id);
create index on public.set_logs (training_exercise_id);
create index on public.foods (coach_id);
create index on public.diet_versions (athlete_id, day_type, valid_from);
create index on public.diet_meals (version_id);
create index on public.diet_options (meal_id);
create index on public.diet_items (option_id);
create index on public.diet_items (food_id);
create index on public.diet_equivalences (item_id);
create index on public.diet_equivalences (food_id);
create index on public.macro_logs (athlete_id, log_date);
create index on public.macro_logs (meal_id);
create index on public.macro_logs (food_id);
create index on public.checkin_sections (coach_id);
create index on public.checkin_fields (section_id);
create index on public.athlete_checkin_fields (field_id);
create index on public.checkin_answers (field_id);
create index on public.feedbacks (athlete_id);
create index on public.feedbacks (checkin_id);
create index on public.energy_logs (athlete_id, log_date);
create index on public.supplements (athlete_id);
create index on public.accessories (athlete_id);
create index on public.accessory_checks (accessory_id);
