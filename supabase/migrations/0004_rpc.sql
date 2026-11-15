-- 0004 · Funciones de copia (SECURITY INVOKER: respetan RLS del usuario que llama)

create or replace function public.create_block(p_athlete uuid, p_name text, p_preset uuid default null, p_starts_on date default null)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_block uuid; v_week uuid; v_day uuid; d record;
begin
  select id into v_block from public.training_blocks where athlete_id = p_athlete and status = 'active';
  if found then return v_block; end if;   -- idempotente: ya hay bloque activo
  begin
    insert into public.training_blocks (athlete_id, name) values (p_athlete, p_name) returning id into v_block;
  exception when unique_violation then
    select id into v_block from public.training_blocks where athlete_id = p_athlete and status = 'active';
    return v_block;
  end;
  insert into public.training_weeks (block_id, week_number, starts_on) values (v_block, 1, p_starts_on) returning id into v_week;
  if p_preset is not null then
    for d in select * from public.preset_days where preset_id = p_preset order by position loop
      insert into public.training_days (week_id, name, weekday, position) values (v_week, d.name, d.weekday, d.position) returning id into v_day;
      insert into public.training_exercises (day_id, exercise_id, position, sets, reps_min, reps_max, rir, rest_min_min, rest_max_min, rest_pause_reps, ar_set, tempo, block_note)
        select v_day, e.exercise_id, e.position, e.sets, e.reps_min, e.reps_max, e.rir, e.rest_min_min, e.rest_max_min, e.rest_pause_reps, e.ar_set, e.tempo, e.block_note
        from public.preset_exercises e where e.day_id = d.id;
    end loop;
  end if;
  return v_block;
end $$;

create or replace function public.duplicate_week(p_week uuid)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare w record; v_new uuid; v_day uuid; d record;
begin
  select * into w from public.training_weeks where id = p_week;
  if not found then raise exception 'Semana no encontrada'; end if;
  select id into v_new from public.training_weeks where block_id = w.block_id and week_number = w.week_number + 1;
  if found then return v_new; end if;   -- idempotente
  insert into public.training_weeks (block_id, week_number, starts_on)
    values (w.block_id, w.week_number + 1, w.starts_on + 7) returning id into v_new;
  for d in select * from public.training_days where week_id = p_week order by position loop
    insert into public.training_days (week_id, name, weekday, position) values (v_new, d.name, d.weekday, d.position) returning id into v_day;
    insert into public.training_exercises (day_id, exercise_id, position, sets, reps_min, reps_max, rir, rest_min_min, rest_max_min, rest_pause_reps, ar_set, tempo, block_note, week_note)
      select v_day, e.exercise_id, e.position, e.sets, e.reps_min, e.reps_max, e.rir, e.rest_min_min, e.rest_max_min, e.rest_pause_reps, e.ar_set, e.tempo, e.block_note, null
      from public.training_exercises e where e.day_id = d.id;
  end loop;
  return v_new;
end $$;

create or replace function public.save_block_as_preset(p_block uuid, p_name text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_week uuid; v_preset uuid; v_day uuid; d record;
begin
  select id into v_week from public.training_weeks where block_id = p_block order by week_number desc limit 1;
  if not found then raise exception 'El bloque no tiene semanas'; end if;
  insert into public.program_presets (coach_id, name) values ((select auth.uid()), p_name) returning id into v_preset;
  for d in select * from public.training_days where week_id = v_week order by position loop
    insert into public.preset_days (preset_id, name, weekday, position) values (v_preset, d.name, d.weekday, d.position) returning id into v_day;
    insert into public.preset_exercises (day_id, exercise_id, position, sets, reps_min, reps_max, rir, rest_min_min, rest_max_min, rest_pause_reps, ar_set, tempo, block_note)
      select v_day, e.exercise_id, e.position, e.sets, e.reps_min, e.reps_max, e.rir, e.rest_min_min, e.rest_max_min, e.rest_pause_reps, e.ar_set, e.tempo, e.block_note
      from public.training_exercises e where e.day_id = d.id;
  end loop;
  return v_preset;
end $$;

create or replace function public.copy_preset_day_to_week(p_pday uuid, p_week uuid)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare d record; v_day uuid; v_pos int;
begin
  select * into d from public.preset_days where id = p_pday;
  if not found then raise exception 'Día de preset no encontrado'; end if;
  select id into v_day from public.training_days where week_id = p_week and name = d.name;
  if found then return v_day; end if;   -- no duplica días con el mismo nombre
  select coalesce(max(position), -1) + 1 into v_pos from public.training_days where week_id = p_week;
  insert into public.training_days (week_id, name, weekday, position) values (p_week, d.name, d.weekday, v_pos) returning id into v_day;
  insert into public.training_exercises (day_id, exercise_id, position, sets, reps_min, reps_max, rir, rest_min_min, rest_max_min, rest_pause_reps, ar_set, tempo, block_note)
    select v_day, e.exercise_id, e.position, e.sets, e.reps_min, e.reps_max, e.rir, e.rest_min_min, e.rest_max_min, e.rest_pause_reps, e.ar_set, e.tempo, e.block_note
    from public.preset_exercises e where e.day_id = p_pday;
  return v_day;
end $$;

-- Copia profunda de una opción dentro de una comida destino
create or replace function public.copy_diet_option(p_option uuid, p_target_meal uuid)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_opt uuid; v_num int; it record; v_item uuid;
begin
  select coalesce(max(option_number), 0) + 1 into v_num from public.diet_options where meal_id = p_target_meal;
  insert into public.diet_options (meal_id, option_number) values (p_target_meal, v_num) returning id into v_opt;
  for it in select * from public.diet_items where option_id = p_option order by position loop
    insert into public.diet_items (option_id, food_id, label, amount, note, position)
      values (v_opt, it.food_id, it.label, it.amount, it.note, it.position) returning id into v_item;
    insert into public.diet_equivalences (item_id, food_id, label, amount, kcal)
      select v_item, q.food_id, q.label, q.amount, q.kcal from public.diet_equivalences q where q.item_id = it.id;
  end loop;
  return v_opt;
end $$;

-- Copia profunda de una comida dentro de una versión destino
create or replace function public.copy_diet_meal(p_meal uuid, p_target_version uuid)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare m record; v_meal uuid; v_pos int; o record; v_opt uuid; it record; v_item uuid;
begin
  select * into m from public.diet_meals where id = p_meal;
  select coalesce(max(position), -1) + 1 into v_pos from public.diet_meals where version_id = p_target_version;
  insert into public.diet_meals (version_id, position, name)
    values (p_target_version, v_pos, case when m.version_id = p_target_version then m.name || ' (copia)' else m.name end)
    returning id into v_meal;
  for o in select * from public.diet_options where meal_id = p_meal order by option_number loop
    insert into public.diet_options (meal_id, option_number) values (v_meal, o.option_number) returning id into v_opt;
    for it in select * from public.diet_items where option_id = o.id order by position loop
      insert into public.diet_items (option_id, food_id, label, amount, note, position)
        values (v_opt, it.food_id, it.label, it.amount, it.note, it.position) returning id into v_item;
      insert into public.diet_equivalences (item_id, food_id, label, amount, kcal)
        select v_item, q.food_id, q.label, q.amount, q.kcal from public.diet_equivalences q where q.item_id = it.id;
    end loop;
  end loop;
  return v_meal;
end $$;

-- Copia profunda de una versión completa (nueva versión o copiar a otro tipo de día)
create or replace function public.clone_diet_version(p_version uuid, p_day_type text, p_valid_from date)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare v record; v_new uuid; m record;
begin
  select * into v from public.diet_versions where id = p_version;
  if not found then raise exception 'Versión no encontrada'; end if;
  insert into public.diet_versions (athlete_id, valid_from, day_type, plan_notes)
    values (v.athlete_id, p_valid_from, p_day_type, v.plan_notes) returning id into v_new;
  for m in select * from public.diet_meals where version_id = p_version order by position loop
    perform public.copy_diet_meal(m.id, v_new);
  end loop;
  return v_new;
end $$;

revoke execute on function public.create_block(uuid, text, uuid, date) from public, anon;
revoke execute on function public.duplicate_week(uuid) from public, anon;
revoke execute on function public.save_block_as_preset(uuid, text) from public, anon;
revoke execute on function public.copy_preset_day_to_week(uuid, uuid) from public, anon;
revoke execute on function public.copy_diet_option(uuid, uuid) from public, anon;
revoke execute on function public.copy_diet_meal(uuid, uuid) from public, anon;
revoke execute on function public.clone_diet_version(uuid, text, date) from public, anon;
grant execute on function public.create_block(uuid, text, uuid, date) to authenticated;
grant execute on function public.duplicate_week(uuid) to authenticated;
grant execute on function public.save_block_as_preset(uuid, text) to authenticated;
grant execute on function public.copy_preset_day_to_week(uuid, uuid) to authenticated;
grant execute on function public.copy_diet_option(uuid, uuid) to authenticated;
grant execute on function public.copy_diet_meal(uuid, uuid) to authenticated;
grant execute on function public.clone_diet_version(uuid, text, date) to authenticated;
