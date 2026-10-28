-- Manufacturer corrections supplied on 2026-10-28; all dimensions are mm.
-- Numeric fields describe the primary configuration; display text retains variants.
BEGIN;
UPDATE products AS p
SET width_mm = v.width_mm,
    depth_mm = v.depth_mm,
    sleeping_length_mm = COALESCE(v.sleep_length_mm, p.sleeping_length_mm),
    sleeping_width_mm = COALESCE(v.sleep_width_mm, p.sleeping_width_mm),
    description_uk = CASE WHEN v.sleep_display IS NULL THEN
      regexp_replace(p.description_uk, $rx$Габаритні розміри \((джерело|виробник)\): [^\r\n]*$rx$,
        'Габаритні розміри (виробник): ' || v.dimension_display, 'g')
    ELSE
      regexp_replace(regexp_replace(p.description_uk, $rx$Габаритні розміри \((джерело|виробник)\): [^\r\n]*$rx$,
        'Габаритні розміри (виробник): ' || v.dimension_display, 'g'),
        $rx$Спальне місце \((джерело|виробник)\): [^\r\n]*$rx$,
        'Спальне місце (виробник): ' || v.sleep_display, 'g')
    END,
    updated_at = now()
FROM (VALUES
  ('hilton-p', 3500, 2040, 2700, 1300, '3500х2040', '2700х1300'),
  ('kutovyy-dyvan-neo-2', 2520, 1630, NULL, NULL, '2520х1630', NULL),
  ('kutovyy-dyvan-neo-3', 3520, 1630, 3000, 1520, '3520х1630', '3000х1520 (2100)'),
  ('kutovyy-dyvan-leon-lyuks-140', 2450, 1500, NULL, NULL, '2450х1500', NULL),
  ('molly', 2450, 1150, 2000, 1600, '2450х1150', '2000х1600'),
  ('pryamyy-dyvan-neo-3', 3520, 1080, 3000, 1520, '3520х1080 (1630)', '3000х1520'),
  ('dyvan-pryamyy-khit', 2350, 1030, 1970, 1500, '2350х1030', '1970х1500'),
  ('dyvan-pryamyy-prestizh', 2400, 1000, 1970, 1470, '2400х1000', '1970х1470'),
  ('pryamyy-dyvan-leon', 2100, 930, 1930, 1350, '2100х930', '1930х1350')
) AS v(slug, width_mm, depth_mm, sleep_length_mm, sleep_width_mm, dimension_display, sleep_display)
WHERE p.slug = v.slug;

-- Previously approved assets at an obsolete scale require another geometry review.
UPDATE product_3d_models AS m
SET status = 'needs_review', enabled_3d = FALSE, enabled_ar = FALSE,
    geometry_verified = FALSE, updated_at = now()
FROM products AS p
WHERE m.product_id = p.id
  AND p.slug IN ('hilton-p', 'kutovyy-dyvan-neo-2', 'kutovyy-dyvan-neo-3', 'kutovyy-dyvan-leon-lyuks-140', 'molly', 'pryamyy-dyvan-neo-3', 'dyvan-pryamyy-khit', 'dyvan-pryamyy-prestizh', 'pryamyy-dyvan-leon')
  AND (m.measured_width_mm IS DISTINCT FROM p.width_mm
       OR m.measured_depth_mm IS DISTINCT FROM p.depth_mm)
  AND m.status = 'approved';
COMMIT;
