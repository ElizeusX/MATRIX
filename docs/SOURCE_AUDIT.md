# MATRIX source audit — 2026-10-23

Primary website: https://matrix-mebli.com. Public homepage, catalog and eight individual product URLs were accessible. The source identifies the manufacturer as a furniture factory based in Cherkasy, Ukraine; the homepage lists +380 (68) 390 39 69 and matrix-mebli@ukr.net.

## Verified product metadata
Nine product names have been documented in the SQL draft seed:
1. Кутовий диван Хілтон-2 — 2800 × 1800 mm, sleeping area 2100 × 1300 mm
2. Кутовий диван Хілтон-П — dimensions not verified
3. Прямий диван Моллі — 2450 × 1150 mm, sleeping area 1950 × 1600 mm
4. Ліра-2 — sleeping area 1400/1600 × 2000 mm (width depends on variant; left NULL)
5. Прямий диван Ельдорадо-2 — 2460 × 1080 mm, sleeping area 1980 × 1600 mm
6. Прямий диван Ельдорадо — 2460 × 1080 mm, sleeping area 1980 × 1600 mm
7. Прямий диван Еллі — source says “238(2410)×1100” (ambiguous width; left NULL)
8. Кутовий диван Смарт — 2460 × 1650 mm, sleeping area 1980 × 1600 mm
9. Прямий диван Рубін — homepage lists 2500 × 1080 mm, sleeping area 2000 × 1550 mm

Categories confirmed: corner sofas, straight sofas, beds. The source's product categorization of “Ліра-2” was not unambiguously exposed by the fetched page, so the seed leaves its category NULL.

Direct product source URLs are stored in `database/seeds/verified_catalog.sql`; the source URL for the homepage-only “Рубін” remains NULL. Draft products stay unpublished, unavailable and unpriced.

## Missing / uncertain
- **0 images copied:** the user has not confirmed rights to redistribute proprietary imagery.
- **0 product prices verified:** source pages did not provide verified publicly readable prices.
- **0 availability promises:** stock cannot be inferred from catalog listing.
- Full fabrics, variants, lead times, delivery, returns and warranties remain unverified.

## Design audit
- https://arbore.cz/produkty/ — restrained taxonomy/material filter hierarchy.
- https://www.teakpeak.cz/collections/loznice — editorial composition and category storytelling.
- Kave Home product link returned HTTP 429; detailed inspection unavailable.

No reference brand assets were imported; design implementation is original and uses CSS neutral placeholders.

## Payment research
- LiqPay Checkout: https://www.liqpay.ua/en/doc/api/internet_acquiring/checkout
- monobank acquiring: https://api.monobank.ua/docs/acquiring.html
- WayForPay merchant documentation still requires dedicated review before implementation.

## Audit limitations
This audit does not establish commercial rights to reuse the source site's photos or descriptions. The metadata-only script respects robots policy when run; offline environment may prevent re-fetching. Verified seed records are idempotent via ON CONFLICT; they are not a live catalog import into any running hosted database.
