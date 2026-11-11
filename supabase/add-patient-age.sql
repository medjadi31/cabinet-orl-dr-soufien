-- À exécuter une seule fois dans Supabase > SQL Editor
-- Ajoute l’âge saisi directement, sans supprimer les anciennes dates de naissance.
alter table public.patients add column if not exists age integer;
alter table public.patients drop constraint if exists patients_age_check;
alter table public.patients add constraint patients_age_check check (age is null or (age >= 0 and age <= 120));
