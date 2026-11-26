-- Applicate al progetto Supabase ymsnlixracwjgajldryb il 26/11/2026 (tramite MCP, execute_sql).

-- 1) Foto dei prodotti con link pubblico permanente per il CSV (scelta dell'utente: «Pubblico, per sempre»).
--    L'app carica anche senza account: solo aggiunta, solo immagini, percorso «<uuid>/<file>» (uuid del telefono o
--    dello spazio cloud del negozio). Nessuna lettura via API: le foto si vedono solo dal link pubblico.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-photos', 'product-photos', true, 20971520,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do nothing;

create policy product_photos_insert_app on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'product-photos'
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9._-]{1,120}$'
  );

-- 2) merge_inventory_snapshot chiamava public.is_organization_member, che dal 20/10 non è eseguibile dai client
--    («permission denied for function is_organization_member» al primo accesso vero, 26/11). Ora chiama
--    auth_internal.is_organization_member (eseguibile da authenticated), come le regole RLS del 20/10.
do $$
declare def text;
begin
  def := pg_get_functiondef('public.merge_inventory_snapshot(uuid,jsonb,jsonb,jsonb,jsonb,jsonb)'::regprocedure);
  if position('public.is_organization_member(' in def) = 0 then
    raise exception 'chiamata non trovata';
  end if;
  def := replace(def, 'public.is_organization_member(', 'auth_internal.is_organization_member(');
  execute def;
end $$;

-- 3) Dashboard (non via SQL): Authentication › Providers › Google abilitato con i client ID Web e Android del
--    progetto Google Cloud syncro-flow-app-20261020 e «Salta i controlli nonce» (accesso nativo Android).
