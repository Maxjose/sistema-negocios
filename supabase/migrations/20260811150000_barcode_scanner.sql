begin;

alter table public.businesses
  add column enable_barcode_scanner boolean not null default false;

comment on column public.businesses.enable_barcode_scanner is
  'Enables barcode input and camera scanning in the point of sale.';

commit;
