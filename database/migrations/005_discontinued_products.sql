-- Retire discontinued models without deleting order history or product records.
BEGIN;
UPDATE products
SET published = FALSE, available = FALSE, updated_at = now()
WHERE slug IN (
  'kutovyy-dyvan-fellini',
  'pryamyy-dyvan-fellini',
  'kutovyy-dyvan-venera',
  'pryamyy-dyvan-venera',
  'kutovyy-dyvan-london-5',
  'kutovyy-dyvan-atlanta-t',
  'kutovyy-dyvan-vehas-t',
  'pryamyy-dyvan-monako',
  'kutovyy-dyvan-monako-2',
  'kutovyy-dyvan-monako-3'
);
COMMIT;
