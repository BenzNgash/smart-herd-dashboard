-- SMART HERD DASHBOARD: authenticated read-only access + Realtime
alter table public.farms enable row level security;
alter table public.animals enable row level security;
alter table public.behavior_5min enable row level security;
alter table public.behavior_15min enable row level security;
alter table public.environment_readings enable row level security;
alter table public.estrus_predictions enable row level security;
alter table public.estrus_alerts enable row level security;

grant usage on schema public to authenticated;
grant select on public.farms, public.animals, public.behavior_5min, public.behavior_15min,
  public.environment_readings, public.estrus_predictions, public.estrus_alerts to authenticated;

drop policy if exists "dashboard read farms" on public.farms;
create policy "dashboard read farms" on public.farms for select to authenticated using (true);
drop policy if exists "dashboard read animals" on public.animals;
create policy "dashboard read animals" on public.animals for select to authenticated using (true);
drop policy if exists "dashboard read behavior 5min" on public.behavior_5min;
create policy "dashboard read behavior 5min" on public.behavior_5min for select to authenticated using (true);
drop policy if exists "dashboard read behavior 15min" on public.behavior_15min;
create policy "dashboard read behavior 15min" on public.behavior_15min for select to authenticated using (true);
drop policy if exists "dashboard read environment" on public.environment_readings;
create policy "dashboard read environment" on public.environment_readings for select to authenticated using (true);
drop policy if exists "dashboard read predictions" on public.estrus_predictions;
create policy "dashboard read predictions" on public.estrus_predictions for select to authenticated using (true);
drop policy if exists "dashboard read alerts" on public.estrus_alerts;
create policy "dashboard read alerts" on public.estrus_alerts for select to authenticated using (true);

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='behavior_5min') then alter publication supabase_realtime add table public.behavior_5min; end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='behavior_15min') then alter publication supabase_realtime add table public.behavior_15min; end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='estrus_predictions') then alter publication supabase_realtime add table public.estrus_predictions; end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='environment_readings') then alter publication supabase_realtime add table public.environment_readings; end if;
end $$;

select schemaname, tablename, rowsecurity from pg_tables
where schemaname='public' and tablename in ('farms','animals','behavior_5min','behavior_15min','environment_readings','estrus_predictions','estrus_alerts')
order by tablename;

select schemaname, tablename from pg_publication_tables
where pubname='supabase_realtime' and schemaname='public' order by tablename;
