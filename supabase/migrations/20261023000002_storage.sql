-- Private document storage. Object paths are "<company_id>/<document_id>/<file>",
-- so the first folder decides which company may read or write the file.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 10485760, array['application/pdf', 'image/png', 'image/jpeg'])
on conflict (id) do nothing;

create policy documents_read on storage.objects for select to authenticated
  using (bucket_id = 'documents' and public.is_member(((storage.foldername(name))[1])::uuid));

create policy documents_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and public.can_edit(((storage.foldername(name))[1])::uuid));

create policy documents_delete on storage.objects for delete to authenticated
  using (bucket_id = 'documents'
    and public.has_role(((storage.foldername(name))[1])::uuid, array['company_admin', 'merch_manager']::public.member_role[]));
