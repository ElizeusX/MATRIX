# Source and design audit — 2026-10-23

## Website A: https://matrix-mebli.com
Public homepage and /furnitures/ catalog were readable via web retrieval.
Confirmed categories: Дивани кутові, Дивани прямі, Ліжка.
Catalog visibly names Хілтон-2 (2800×1800 mm, sleeper 2100×1300 mm),
Моллі (2450×1150 mm, sleeper 1950×1600 mm),
Ельдорадо (2460×1080 mm, sleeper 1980×1600 mm),
Смарт (2460×1650 mm, sleeper 1980×1600 mm).
Homepage displays Рубін (2500×1080 mm, sleeper 2000×1550 mm).
Contact phone on source: +380 (68) 390 39 69.

### Limitations
- No verified commercial prices, stock, lead times or detailed upholstery choices.
- Media usage rights have NOT been confirmed: **0 source photographs copied**.
- Category filtered URLs were not accessible to the research fetcher.
- Product source URL fields should use individual canonical URLs once verified; avoid interpreting a category page as an individual product URL.
- All seeded products remain unpublished, unavailable and unpriced.

## Design references
- Arbore: navigation taxonomy, understated design and material-led filtering.
- TeakPeak: warm editorial language and category storytelling.
- Kave Home product link returned HTTP 429; detailed audit blocked.
No reference site images or branded elements were copied.

## Payment documentation
- LiqPay Checkout: https://www.liqpay.ua/en/doc/api/internet_acquiring/checkout
- monobank: https://api.monobank.ua/docs/acquiring.html
- WayForPay: evaluate against current official merchant integration docs before activation.

## Rights and external dependencies
Document written permission for migrating MATRIX photographs and descriptions before import.
Merchant account, HTTPS domain, secrets and delivery provider credentials remain prerequisites.
