-- BMC Gála 2026 – vendégérkeztetés (hostess felület → LED fal üdvözlés)
-- Futtatás: Supabase Dashboard → SQL Editor → ezt a teljes fájlt beilleszteni → Run.
-- Többször is lefuttatható (idempotens).

create extension if not exists pgcrypto;

-- Vendéglista: importból vagy kézzel felvéve
create table if not exists public.guests (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  company       text,                 -- a cég neve, ahogy a regisztrációs listában szerepel
  company_id    text,                 -- ha Best Managed cég: a companies.js azonosítója (logóhoz)
  email         text,
  note          text,
  source        text not null default 'import' check (source in ('import', 'manual')),
  checked_in_at timestamptz,          -- null = még nem érkezett meg
  created_at    timestamptz not null default now()
);
create index if not exists guests_name_idx on public.guests (lower(name));

-- Üdvözlési események: a LED fal ezekre iratkozik fel.
-- Szándékosan csak a cégnevet tartalmazza (vendégnevet nem), mert a LED fal bejelentkezés nélkül olvassa.
create table if not exists public.welcome_events (
  id          bigint generated always as identity primary key,
  company     text not null,
  company_id  text,
  created_at  timestamptz not null default now()
);

-- Érkeztetéskor (null → időpont) automatikusan üdvözlési esemény, ha a vendéghez cég tartozik
create or replace function public.guest_welcome() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.checked_in_at is not null
     and (tg_op = 'INSERT' or old.checked_in_at is null)
     and coalesce(btrim(new.company), '') <> '' then
    insert into public.welcome_events (company, company_id) values (btrim(new.company), new.company_id);
  end if;
  return new;
end $$;

-- csak triggerként fut, API-n (rpc) ne legyen hívható
revoke execute on function public.guest_welcome() from public, anon, authenticated;

drop trigger if exists guests_welcome on public.guests;
create trigger guests_welcome after insert or update of checked_in_at on public.guests
  for each row execute function public.guest_welcome();

-- Jogosultságok (RLS)
alter table public.guests enable row level security;
alter table public.welcome_events enable row level security;

-- vendéglista: csak a hostess-fiók (config.js → hostessEmail); ha más e-mailt használsz, itt is írd át.
-- Így akkor sem fér hozzá senki, ha valaki a nyilvános kulccsal saját fiókot regisztrálna.
drop policy if exists guests_hostess on public.guests;
create policy guests_hostess on public.guests for all to authenticated
  using ((auth.jwt() ->> 'email') = 'hostess@bmc-gala.hu')
  with check ((auth.jwt() ->> 'email') = 'hostess@bmc-gala.hu');

-- üdvözlések: a LED fal (bejelentkezés nélkül) olvashatja, a hostess kézzel is indíthat újat
drop policy if exists welcome_read on public.welcome_events;
create policy welcome_read on public.welcome_events for select to anon, authenticated using (true);
drop policy if exists welcome_insert on public.welcome_events;
create policy welcome_insert on public.welcome_events for insert to authenticated
  with check ((auth.jwt() ->> 'email') = 'hostess@bmc-gala.hu');

grant select, insert, update, delete on public.guests to authenticated;
grant select on public.welcome_events to anon, authenticated;
grant insert on public.welcome_events to authenticated;

-- LED fal „A mai este”: megérkezett vendégek száma. Bejelentkezés nélkül hívható, de csak egy számot ad vissza (nevet nem).
create or replace function public.arrived_count() returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.guests where checked_in_at is not null
$$;
revoke execute on function public.arrived_count() from public;
grant execute on function public.arrived_count() to anon, authenticated;

-- Valós idejű értesítések (több hostess-tablet szinkronja + LED fal)
alter table public.guests replica identity full;
do $$ begin
  begin alter publication supabase_realtime add table public.guests; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.welcome_events; exception when duplicate_object then null; end;
end $$;
