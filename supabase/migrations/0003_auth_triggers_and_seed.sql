-- 0003 · Triggers de auth, invitación de coach y datos iniciales del coach

-- Correos autorizados a ser coach (solo editable por SQL; el esquema private no está expuesto en la API)
create table private.coach_invites (
  email text primary key,
  full_name text not null,
  coach_slug text not null unique
);
alter table private.coach_invites enable row level security;

-- Carga los datos iniciales de un coach nuevo: alimentos, ejercicios y campos de check-in
create or replace function private.seed_coach(p_coach uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare s uuid;
begin
  if exists (select 1 from public.foods where coach_id = p_coach) then return; end if;

  insert into public.foods (coach_id, name, unit, kcal_per_unit, protein_per_unit, carbs_per_unit, fat_per_unit)
  select p_coach, v.* from (values
    ('Arroz (pesado en crudo)','g',343,6.6,77.9,0.6),
    ('Pasta (pesado en crudo)','g',338,11,69,2),
    ('Papa (pesado en crudo)','g',73,2,16.2,0),
    ('Camote (pesado en crudo)','g',87,1.6,20,0.1),
    ('Avena','g',341,13.1,57.6,6.5),
    ('Marraqueta/ciabatta/baguette','g',277,9.6,55.9,1.7),
    ('Rebanada de pan de molde','u',66,2.5,12.2,0.85),
    ('Pechuga de pollo (pesado en cocido)','g',149,31.9,0,2.4),
    ('Pechuga de pollo (pesado en crudo)','g',105,22.3,0,1.7),
    ('Carne molida 7% (pesado en crudo)','g',167,26,0,7),
    ('Salmón (peso crudo)','g',197,20,0,13),
    ('Jamón de pechuga de pavo','g',123,24.1,0,3),
    ('Huevo entero','u',70,6.3,0.4,4.8),
    ('Claras de huevo','g',48,10.9,0.7,0.2),
    ('Yogurt griego sin grasa','g',56,10,3.5,0.2),
    ('Leche descremada','g',33,3.3,4.7,0.1),
    ('Whey isolate','g',346,76.5,3.1,3.1),
    ('Aceite de oliva','g',900,0,0,100),
    ('Palta','g',169,1.7,5.9,15.4),
    ('Mantequilla de maní','g',576,20,3.5,53.5),
    ('Almendras','g',620,21.2,21.6,49.9),
    ('Plátano','g',90,1.5,21,0),
    ('Manzana','g',53,0,13.3,0),
    ('Brócoli','g',34,2.8,6.6,0.4),
    ('Tomate','g',16,1,3,0),
    ('Porción de fruta (75 kcal)','u',74,0.5,18,0),
    ('Vegetales 100 kcal','u',100,5,20,0),
    ('Naranja','g',57,1,13.5,0.1),
    ('Kiwi','u',42,0.8,10,0.4),
    ('Piña','g',55,0.5,13,0.1),
    ('Frutillas','g',30,0.7,7.7,0.3),
    ('Arándanos','g',64,0.7,14.5,0.3)
  ) as v(name, unit, kcal, p, c, f);

  insert into public.exercises (coach_id, name, muscle_group) select p_coach, v.* from (values
    ('Press banca con barra','Pecho'),('Press inclinado con mancuernas','Pecho'),('Aperturas en máquina','Pecho'),
    ('Dominadas','Espalda'),('Jalón al pecho','Espalda'),('Remo con barra','Espalda'),('Remo en polea baja','Espalda'),
    ('Press militar','Hombros'),('Elevaciones laterales','Hombros'),('Face pull','Hombros'),
    ('Curl con barra','Bíceps'),('Curl martillo','Bíceps'),
    ('Extensión de tríceps en polea','Tríceps'),('Press francés','Tríceps'),
    ('Sentadilla con barra','Cuádriceps'),('Prensa','Cuádriceps'),('Extensión de cuádriceps','Cuádriceps'),
    ('Peso muerto rumano','Isquiotibiales'),('Curl femoral','Isquiotibiales'),
    ('Hip thrust','Glúteos'),('Zancadas','Glúteos'),
    ('Elevación de talones','Pantorrillas'),('Crunch en polea','Abdomen')
  ) as v(name, mg);

  insert into public.checkin_sections (coach_id, name, position) values (p_coach,'Biofeedback',0) returning id into s;
  insert into public.checkin_fields (section_id, label, field_type, unit, options, weekly, default_on, position) values
    (s,'Peso en ayunas','number','kg',null,false,true,0),
    (s,'Energía','scale_1_5',null,null,false,true,1),
    (s,'Estrés','scale_1_5',null,null,false,true,2),
    (s,'Motivación','scale_1_5',null,null,false,true,3);
  insert into public.checkin_sections (coach_id, name, position) values (p_coach,'Sueño',1) returning id into s;
  insert into public.checkin_fields (section_id, label, field_type, unit, options, weekly, default_on, position) values
    (s,'Hora de acostarse','time_of_day',null,null,false,true,0),
    (s,'Hora de despertar','time_of_day',null,null,false,true,1),
    (s,'Horas de sueño','time_duration','h',null,false,true,2),
    (s,'Calidad del sueño','scale_1_5',null,null,false,true,3),
    (s,'Siesta','nap_detail','min',null,false,false,4);
  insert into public.checkin_sections (coach_id, name, position) values (p_coach,'Entrenamiento',2) returning id into s;
  insert into public.checkin_fields (section_id, label, field_type, unit, options, weekly, default_on, position) values
    (s,'Entrenamiento del día','workout_select',null,null,false,true,0),
    (s,'Cardio','cardio','min',null,false,true,1),
    (s,'Pasos','number','pasos',null,false,true,2);
  insert into public.checkin_sections (coach_id, name, position) values (p_coach,'Nutrición',3) returning id into s;
  insert into public.checkin_fields (section_id, label, field_type, unit, options, weekly, default_on, position) values
    (s,'Adherencia a la pauta','scale_1_10',null,null,false,true,0),
    (s,'Macros del día','macros','g',null,false,false,1),
    (s,'Agua','number','L',null,false,true,2);
  insert into public.checkin_sections (coach_id, name, position) values (p_coach,'Hambre y apetito',4) returning id into s;
  insert into public.checkin_fields (section_id, label, field_type, unit, options, weekly, default_on, position) values
    (s,'Hambre','scale_1_5',null,null,false,true,0),
    (s,'Antojos','boolean_detail',null,null,false,true,1);
  insert into public.checkin_sections (coach_id, name, position) values (p_coach,'Digestión',5) returning id into s;
  insert into public.checkin_fields (section_id, label, field_type, unit, options, weekly, default_on, position) values
    (s,'Digestión','enum',null,'["Buena","Regular","Mala"]'::jsonb,false,true,0),
    (s,'Molestias digestivas','boolean_detail',null,null,false,false,1);
  insert into public.checkin_sections (coach_id, name, position) values (p_coach,'Salud',6) returning id into s;
  insert into public.checkin_fields (section_id, label, field_type, unit, options, weekly, default_on, position) values
    (s,'Dolores o molestias','boolean_detail',null,null,false,true,0),
    (s,'Enfermedad','boolean_detail',null,null,false,false,1);
  insert into public.checkin_sections (coach_id, name, position) values (p_coach,'Nota del día',7) returning id into s;
  insert into public.checkin_fields (section_id, label, field_type, unit, options, weekly, default_on, position) values
    (s,'Nota','text',null,null,false,true,0);
  insert into public.checkin_sections (coach_id, name, position) values (p_coach,'Resumen semanal',8) returning id into s;
  insert into public.checkin_fields (section_id, label, field_type, unit, options, weekly, default_on, position) values
    (s,'Cintura','number','cm',null,true,true,0),
    (s,'Adherencia al entrenamiento','scale_1_10',null,null,true,true,1),
    (s,'Adherencia a la nutrición','scale_1_10',null,null,true,true,2),
    (s,'Fatiga general','scale_1_10',null,null,true,true,3),
    (s,'Ciclo menstrual','enum_detail',null,'["No aplica","Folicular","Ovulación","Lútea","Menstruación"]'::jsonb,true,false,4),
    (s,'¿Qué salió bien esta semana?','long_text',null,null,true,true,5),
    (s,'¿Qué te costó?','long_text',null,null,true,true,6),
    (s,'Preguntas para tu coach','long_text',null,null,true,true,7);
end $$;

-- Al registrarse: crea el perfil. Solo un correo invitado (private.coach_invites) queda como coach;
-- cualquier otro registro queda SIEMPRE como athlete, asignado al coach del link.
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_coach uuid; v_inv record;
begin
  select * into v_inv from private.coach_invites where lower(email) = lower(new.email);
  if found then
    insert into public.profiles (id, role, full_name, coach_slug)
    values (new.id, 'coach', v_inv.full_name, v_inv.coach_slug);
    perform private.seed_coach(new.id);
    return new;
  end if;

  select id into v_coach from public.profiles
    where role = 'coach' and coach_slug = new.raw_user_meta_data->>'coach_slug';
  insert into public.profiles (id, role, full_name, phone, birth_date, coach_id)
  values (new.id, 'athlete',
          coalesce(nullif(new.raw_user_meta_data->>'full_name',''), split_part(new.email,'@',1)),
          nullif(new.raw_user_meta_data->>'phone',''),
          nullif(new.raw_user_meta_data->>'birth_date','')::date,
          v_coach);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- Guardia: nadie desde la API cambia role/coach_id/coach_slug;
-- access_from, active, checkin_day y water_goal_l solo los cambia el coach del alumno.
create or replace function private.guard_profile_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null and (new.role is distinct from old.role
      or new.coach_id is distinct from old.coach_id or new.coach_slug is distinct from old.coach_slug) then
    raise exception 'No puedes cambiar role, coach_id ni coach_slug';
  end if;
  if (select auth.uid()) is not null and old.role = 'athlete'
     and old.coach_id is distinct from (select auth.uid())
     and (new.access_from is distinct from old.access_from or new.active is distinct from old.active
          or new.checkin_day is distinct from old.checkin_day or new.water_goal_l is distinct from old.water_goal_l) then
    raise exception 'Solo tu coach puede cambiar la fecha de habilitación, estado, día de check-in o meta de agua';
  end if;
  return new;
end $$;
create trigger guard_profile_update before update on public.profiles
  for each row execute function private.guard_profile_update();

-- Permite a /register validar un slug antes de registrar (devuelve solo el nombre del coach)
create or replace function public.coach_name_by_slug(p_slug text) returns text
language sql security definer stable set search_path = '' as $$
  select full_name from public.profiles where role = 'coach' and coach_slug = p_slug;
$$;
grant execute on function public.coach_name_by_slug(text) to anon, authenticated;

insert into private.coach_invites (email, full_name, coach_slug)
values ('pipefuentes.m@gmail.com', 'Felipe Fuentes', 'felipe');
