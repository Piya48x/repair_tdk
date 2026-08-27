-- Logical database separation for PC, Notebook and Monitor assets.
-- The master data stays in public.it_assets so UUID, QR, evidence and history remain intact.

begin;

create or replace view public.it_assets_pc
with (security_invoker = true)
as
select asset.*
from public.it_assets asset
where lower(trim(asset.asset_category)) = 'pc';

create or replace view public.it_assets_notebook
with (security_invoker = true)
as
select asset.*
from public.it_assets asset
where lower(trim(asset.asset_category)) = 'notebook';

create or replace view public.it_assets_monitor
with (security_invoker = true)
as
select asset.*
from public.it_assets asset
where lower(trim(asset.asset_category)) = 'monitor';

revoke all on public.it_assets_pc from anon;
revoke all on public.it_assets_notebook from anon;
revoke all on public.it_assets_monitor from anon;

grant select on public.it_assets_pc to authenticated;
grant select on public.it_assets_notebook to authenticated;
grant select on public.it_assets_monitor to authenticated;

comment on view public.it_assets_pc is
  'PC-only view over the central IT asset master.';

comment on view public.it_assets_notebook is
  'Notebook-only view over the central IT asset master.';

comment on view public.it_assets_monitor is
  'Monitor-only view over the central IT asset master.';

notify pgrst, 'reload schema';

commit;

-- Supabase SQL Editor displays the separated totals after the migration finishes.
select 'PC' as asset_group, count(*)::integer as total
from public.it_assets_pc
union all
select 'Notebook', count(*)::integer
from public.it_assets_notebook
union all
select 'Monitor', count(*)::integer
from public.it_assets_monitor;

