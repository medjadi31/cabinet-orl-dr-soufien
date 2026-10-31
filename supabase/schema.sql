-- CABINET ORL — schéma initial Supabase
-- À exécuter dans SQL Editor d'un projet Supabase privé.
-- IMPORTANT : activer MFA pour le médecin, utiliser des mots de passe forts,
-- limiter les comptes, vérifier les obligations légales locales et réaliser des sauvegardes chiffrées.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('doctor','secretary')),
  created_at timestamptz not null default now()
);

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  phone text,
  birth_date date,
  sex text check (sex in ('F','M') or sex is null),
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete restrict,
  appointment_date date not null,
  appointment_time time not null,
  reason text,
  status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled','no_show')),
  created_at timestamptz not null default now()
);

create table if not exists public.consultations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete restrict,
  appointment_id uuid references public.appointments(id) on delete set null,
  consultation_date timestamptz not null default now(),
  reason text,
  history text,
  clinical_exam text,
  orl_exam text,
  diagnosis text,
  treatment text,
  prescription text,
  follow_up text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete restrict,
  consultation_id uuid references public.consultations(id) on delete set null,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'DZD',
  payment_method text,
  payment_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  consultation_id uuid references public.consultations(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  content_type text,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists patients_name_idx on public.patients (last_name, first_name);
create index if not exists appointments_date_idx on public.appointments (appointment_date, appointment_time);
create index if not exists consultations_patient_date_idx on public.consultations (patient_id, consultation_date desc);
create index if not exists payments_date_idx on public.payments (payment_date desc);

alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;
alter table public.consultations enable row level security;
alter table public.payments enable row level security;
alter table public.attachments enable row level security;

-- Aucun accès anonyme. Seuls les comptes présents dans profiles peuvent accéder.
create or replace function public.current_staff_role()
returns text language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create policy "staff can read profiles" on public.profiles for select to authenticated
using (id = auth.uid() or public.current_staff_role() = 'doctor');

create policy "staff read patients" on public.patients for select to authenticated
using (public.current_staff_role() in ('doctor','secretary'));
create policy "staff insert patients" on public.patients for insert to authenticated
with check (public.current_staff_role() in ('doctor','secretary'));
create policy "staff update patients" on public.patients for update to authenticated
using (public.current_staff_role() in ('doctor','secretary'))
with check (public.current_staff_role() in ('doctor','secretary'));
create policy "doctor delete patients" on public.patients for delete to authenticated
using (public.current_staff_role() = 'doctor');

create policy "staff manage appointments" on public.appointments for all to authenticated
using (public.current_staff_role() in ('doctor','secretary'))
with check (public.current_staff_role() in ('doctor','secretary'));

create policy "staff read consultations" on public.consultations for select to authenticated
using (public.current_staff_role() in ('doctor','secretary'));
create policy "doctor insert consultations" on public.consultations for insert to authenticated
with check (public.current_staff_role() = 'doctor');
create policy "doctor update consultations" on public.consultations for update to authenticated
using (public.current_staff_role() = 'doctor') with check (public.current_staff_role() = 'doctor');
create policy "doctor delete consultations" on public.consultations for delete to authenticated
using (public.current_staff_role() = 'doctor');

create policy "staff read payments" on public.payments for select to authenticated
using (public.current_staff_role() in ('doctor','secretary'));
create policy "staff manage payments" on public.payments for insert to authenticated
with check (public.current_staff_role() in ('doctor','secretary'));
create policy "doctor update payments" on public.payments for update to authenticated
using (public.current_staff_role() = 'doctor') with check (public.current_staff_role() = 'doctor');
create policy "doctor delete payments" on public.payments for delete to authenticated
using (public.current_staff_role() = 'doctor');

create policy "staff read attachments" on public.attachments for select to authenticated
using (public.current_staff_role() in ('doctor','secretary'));
create policy "doctor manage attachments" on public.attachments for all to authenticated
using (public.current_staff_role() = 'doctor') with check (public.current_staff_role() = 'doctor');

-- Le bucket de fichiers doit être privé. Créer le bucket 'patient-files' en mode PRIVATE
-- dans Supabase Storage, puis ajouter des policies Storage strictes avant tout usage.
-- Ne jamais mettre la clé service_role dans le navigateur.
