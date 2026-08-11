-- ============================================================
-- TheCollector — PowerSync replication role + publication
-- Apply with: psql ... -v ps_password='<secret>' -f replication.sql
-- Password comes in as a psql variable — never committed.
-- Author(s): John Reed
-- ============================================================

-- Create the role only if missing (psql \gexec conditional —
-- variables don't substitute inside dollar-quoted do-blocks).
select 'create role powersync_role'
where not exists (select from pg_roles where rolname = 'powersync_role')
\gexec

alter role powersync_role with replication bypassrls login password :'ps_password';

grant select on all tables in schema public to powersync_role;
alter default privileges in schema public grant select on tables to powersync_role;

drop publication if exists powersync;
create publication powersync for table public.collections, public.items;
