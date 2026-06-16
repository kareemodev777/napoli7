-- Replace the redundant "Medium pizza" / "Small pizza" size detail with the
-- actual pizza diameter so the menu shows "30 cm" (medium) and "24 cm" (small)
-- under the size label instead of repeating the label.
--
-- Targeted by the existing detail text (case-insensitive) so only pizza size
-- rows are touched; drinks and other items are unaffected.

update public.product_sizes
set detail = '30 cm'
where lower(trim(detail)) = 'medium pizza';

update public.product_sizes
set detail = '24 cm'
where lower(trim(detail)) = 'small pizza';
