begin;

create index if not exists documents_source_id_idx
  on public.documents (source_id);

create index if not exists source_quotes_document_id_idx
  on public.source_quotes (document_id);

commit;
