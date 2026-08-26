-- Shop category engine: extra business_category values, product attrs, floor + tickets.
-- Category is the only vertical flag (no separate niche column).

alter type public.business_category add value if not exists 'ELECTRONICS';
alter type public.business_category add value if not exists 'AGRITECH';
alter type public.business_category add value if not exists 'SERVICES';
