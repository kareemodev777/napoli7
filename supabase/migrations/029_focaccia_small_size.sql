-- Put the small focaccia back on the menu.
--
-- The three focaccias each had a single size row labelled "One size", so the menu
-- rendered no size picker for them (one is only offered when a product has more
-- than one size) and the small was unbuyable. The POS has stocked it all along:
--   Focaccia Mortadella small  FOC-0222  35
--   Focaccia Bresaola small    FOC-0223  32
--   Focaccia Veal Ham small    FOC-0224  29
--
-- Those are the prices used here. The POS carries focaccia at two price tiers —
-- a higher one (regular 64/62/56, small 47/43/39) and a lower one (regular
-- 48/46/42, small 35/32/29). The website's regular prices are 48/46/42, so it
-- sells the lower tier, and these are its small prices.
--
-- "One size" becomes "Regular": with a small alongside it, the old label is a lie.
-- Detail is left blank — the pizzas quote 30 cm / 24 cm, but nobody has given us
-- the focaccia dimensions, and an invented one would print on the menu.
--
-- Apply via: supabase db push  (or paste into SQL editor). Run after 028.

UPDATE product_sizes ps
   SET label = 'Regular'
  FROM products p
 WHERE p.id = ps.product_id
   AND ps.label = 'One size'
   AND p.name LIKE 'Focaccia %';

INSERT INTO product_sizes (product_id, size_id, label, detail, price_aed, position)
SELECT p.id, 'small', 'Small', '', v.price, 1
  FROM products p
  JOIN (VALUES
          ('Focaccia Mortadella', 35::numeric),
          ('Focaccia Bresaola',   32::numeric),
          ('Focaccia Veal Ham',   29::numeric)
       ) AS v(name, price) ON v.name = p.name
 WHERE NOT EXISTS (
         SELECT 1 FROM product_sizes existing
          WHERE existing.product_id = p.id AND existing.size_id = 'small'
       );
