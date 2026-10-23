# MATRIX Mobile Preview for GitHub Pages

An original, dependency-free, static design prototype for testing **mobile layout** at `https://elizeusx.github.io/MATRIX/` after GitHub Pages is enabled and deployment succeeds.

## What this preview does
- Ukrainian/English language toggle.
- Responsive mobile menu and page navigation.
- Three collection tiles, text search and category filters.
- Nine catalog names sourced from the approved factual audit, clearly unpriced.
- Product detail dialogs with verified dimensions only, where available.
- Locally persisted favorites for UX testing.
- Contact links for the brand.

## What it DOES NOT do
No real MATRIX photos have been copied (rights not confirmed). All graphics are original CSS/SVG illustrations, **not product images**. Prices and inventory are unavailable. There is no functional backend, shopping cart, payments, order capture or admin access on Pages.

The preview contains no sensitive credentials or private data. Nevertheless, a GitHub Pages deployment is generally publicly viewable, even when the source repository is private.

## Deployment
The `.github/workflows/pages-preview.yml` workflow packages this directory only, not the monorepo backend.
If deployment fails because Pages is disabled, go to:
`https://github.com/ElizeusX/MATRIX/settings/pages`
Then under **Build and deployment → Source**, choose **GitHub Actions**.

For a private repository, GitHub Pro or Team/Enterprise is required; GitHub Free may require a separate public preview repository instead. **Do not make MATRIX public merely to publish the demo.**

## Local test
```sh
cd preview
python3 -m http.server 8089
```
Open http://localhost:8089 in a browser.

Content is an independent UI demonstration, not a static export of the Next.js and Go application.
