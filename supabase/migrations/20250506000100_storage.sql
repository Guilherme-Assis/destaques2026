-- Bucket público de avatares para indicados.
-- Leitura aberta (qualquer um vê a foto exibida no pódio); escrita só via service_role no backend.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- garante que ninguém com chave anon consiga subir/atualizar/apagar; só leitura pública.
drop policy if exists "avatars: leitura pública"  on storage.objects;
create policy "avatars: leitura pública"
  on storage.objects for select
  using (bucket_id = 'avatars');
