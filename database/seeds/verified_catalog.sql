-- Read-only catalog evidence from public pages. No source images or descriptions copied.
-- Product price, availability and publication intentionally remain NULL/FALSE/FALSE.
INSERT INTO categories(slug,title_uk,title_en) VALUES
('corner-sofas','Дивани кутові','Corner sofas'),
('straight-sofas','Дивани прямі','Straight sofas'),
('beds','Ліжка','Beds')
ON CONFLICT(slug) DO NOTHING;

INSERT INTO products(category_id,slug,source_url,title_uk,title_en,width_mm,depth_mm,sleeping_width_mm,sleeping_length_mm)
VALUES ((SELECT id FROM categories WHERE slug='corner-sofas'), 'hilton-2', 'https://matrix-mebli.com/furniture/кутовий-диван-хілтон-2/', 'Кутовий диван Хілтон-2', 'Hilton-2 corner sofa', 2800, 1800, 1300, 2100)
ON CONFLICT(slug) DO NOTHING;
INSERT INTO products(category_id,slug,source_url,title_uk,title_en,width_mm,depth_mm,sleeping_width_mm,sleeping_length_mm)
VALUES ((SELECT id FROM categories WHERE slug='corner-sofas'), 'hilton-p', 'https://matrix-mebli.com/furniture/кутовий-диван-хілтон-п/', 'Кутовий диван Хілтон-П', 'Hilton-P corner sofa', NULL, NULL, NULL, NULL)
ON CONFLICT(slug) DO NOTHING;
INSERT INTO products(category_id,slug,source_url,title_uk,title_en,width_mm,depth_mm,sleeping_width_mm,sleeping_length_mm)
VALUES ((SELECT id FROM categories WHERE slug='straight-sofas'), 'molly', 'https://matrix-mebli.com/furniture/прямий-диван-моллі/', 'Прямий диван Моллі', 'Molly straight sofa', 2450, 1150, 1600, 1950)
ON CONFLICT(slug) DO NOTHING;
INSERT INTO products(category_id,slug,source_url,title_uk,title_en,width_mm,depth_mm,sleeping_width_mm,sleeping_length_mm)
VALUES ((SELECT id FROM categories WHERE slug=NULL), 'lira-2', 'https://matrix-mebli.com/furniture/ліра-2/', 'Ліра-2', 'Lira-2', NULL, NULL, NULL, 2000)
ON CONFLICT(slug) DO NOTHING;
INSERT INTO products(category_id,slug,source_url,title_uk,title_en,width_mm,depth_mm,sleeping_width_mm,sleeping_length_mm)
VALUES ((SELECT id FROM categories WHERE slug='straight-sofas'), 'eldorado-2', 'https://matrix-mebli.com/furniture/прямий-диван-ельдорадо-2/', 'Прямий диван Ельдорадо-2', 'Eldorado-2 straight sofa', 2460, 1080, 1600, 1980)
ON CONFLICT(slug) DO NOTHING;
INSERT INTO products(category_id,slug,source_url,title_uk,title_en,width_mm,depth_mm,sleeping_width_mm,sleeping_length_mm)
VALUES ((SELECT id FROM categories WHERE slug='straight-sofas'), 'eldorado', 'https://matrix-mebli.com/furniture/прямий-диван-ельдорадо/', 'Прямий диван Ельдорадо', 'Eldorado straight sofa', 2460, 1080, 1600, 1980)
ON CONFLICT(slug) DO NOTHING;
INSERT INTO products(category_id,slug,source_url,title_uk,title_en,width_mm,depth_mm,sleeping_width_mm,sleeping_length_mm)
VALUES ((SELECT id FROM categories WHERE slug='straight-sofas'), 'elli', 'https://matrix-mebli.com/furniture/прямий-диван-еллі/', 'Прямий диван Еллі', 'Elli straight sofa', NULL, 1100, 1600, 1980)
ON CONFLICT(slug) DO NOTHING;
INSERT INTO products(category_id,slug,source_url,title_uk,title_en,width_mm,depth_mm,sleeping_width_mm,sleeping_length_mm)
VALUES ((SELECT id FROM categories WHERE slug='corner-sofas'), 'smart', 'https://matrix-mebli.com/furniture/кутовий-диван/', 'Кутовий диван Смарт', 'Smart corner sofa', 2460, 1650, 1600, 1980)
ON CONFLICT(slug) DO NOTHING;
INSERT INTO products(category_id,slug,source_url,title_uk,title_en,width_mm,depth_mm,sleeping_width_mm,sleeping_length_mm)
VALUES ((SELECT id FROM categories WHERE slug='straight-sofas'), 'rubin', NULL, 'Прямий диван Рубін', 'Rubin straight sofa', 2500, 1080, 1550, 2000)
ON CONFLICT(slug) DO NOTHING;
