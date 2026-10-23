-- Editorial-only verified source facts. No source prices or stock status available.
INSERT INTO categories(slug,title_uk,title_en) VALUES
('corner-sofas','Дивани кутові','Corner sofas'),
('straight-sofas','Дивани прямі','Straight sofas'),
('beds','Ліжка','Beds')
ON CONFLICT(slug) DO NOTHING;
INSERT INTO products(category_id,slug,title_uk,title_en,width_mm,depth_mm,sleeping_width_mm,sleeping_length_mm)
SELECT id,'hilton-2','Кутовий диван Хілтон-2','Hilton-2 corner sofa',2800,1800,1300,2100 FROM categories WHERE slug='corner-sofas'
ON CONFLICT(slug) DO NOTHING;
INSERT INTO products(category_id,slug,title_uk,title_en,width_mm,depth_mm,sleeping_width_mm,sleeping_length_mm)
SELECT id,'molly','Прямий диван Моллі','Molly straight sofa',2450,1150,1600,1950 FROM categories WHERE slug='straight-sofas'
ON CONFLICT(slug) DO NOTHING;
INSERT INTO products(category_id,slug,title_uk,title_en,width_mm,depth_mm,sleeping_width_mm,sleeping_length_mm)
SELECT id,'eldorado','Прямий диван Ельдорадо','Eldorado straight sofa',2460,1080,1600,1980 FROM categories WHERE slug='straight-sofas'
ON CONFLICT(slug) DO NOTHING;
INSERT INTO products(category_id,slug,title_uk,title_en,width_mm,depth_mm,sleeping_width_mm,sleeping_length_mm)
SELECT id,'smart','Кутовий диван Смарт','Smart corner sofa',2460,1650,1600,1980 FROM categories WHERE slug='corner-sofas'
ON CONFLICT(slug) DO NOTHING;
