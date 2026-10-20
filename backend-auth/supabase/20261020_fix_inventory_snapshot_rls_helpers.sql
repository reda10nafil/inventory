-- Fix tenant snapshot RLS policies to call the private authorization helpers.
-- Applied to Supabase project ymsnlixracwjgajldryb on 2026-10-20.
-- Use auth_internal helpers (EXECUTE is granted to authenticated) instead of the
-- public SECURITY DEFINER wrappers, which intentionally are not executable by clients.

drop policy if exists organization_inventory_snapshots_read_member on public.organization_inventory_snapshots;
create policy organization_inventory_snapshots_read_member
  on public.organization_inventory_snapshots
  for select to authenticated
  using (auth_internal.is_organization_member(organization_id));

drop policy if exists organization_inventory_snapshots_insert_member on public.organization_inventory_snapshots;
create policy organization_inventory_snapshots_insert_member
  on public.organization_inventory_snapshots
  for insert to authenticated
  with check (
    auth_internal.has_organization_role(
      organization_id,
      ARRAY['owner'::public.organization_role, 'admin'::public.organization_role, 'operator'::public.organization_role]
    )
    and updated_by = auth.uid()
  );

drop policy if exists organization_inventory_snapshots_update_member on public.organization_inventory_snapshots;
create policy organization_inventory_snapshots_update_member
  on public.organization_inventory_snapshots
  for update to authenticated
  using (
    auth_internal.has_organization_role(
      organization_id,
      ARRAY['owner'::public.organization_role, 'admin'::public.organization_role, 'operator'::public.organization_role]
    )
  )
  with check (
    auth_internal.has_organization_role(
      organization_id,
      ARRAY['owner'::public.organization_role, 'admin'::public.organization_role, 'operator'::public.organization_role]
    )
    and updated_by = auth.uid()
  );
