-- Manufacturer name correction; retain the product ID, slug and dimensions.
BEGIN;
UPDATE products
SET title_uk = 'Прямий диван Нео 196', title_en = 'Прямий диван Нео 196', updated_at = now()
WHERE slug = 'pryamyy-dyvan-neo-230';
UPDATE product_media AS m
SET alt_uk = 'Прямий диван Нео 196', alt_en = 'Прямий диван Нео 196'
FROM products AS p
WHERE m.product_id = p.id AND p.slug = 'pryamyy-dyvan-neo-230';
COMMIT;
