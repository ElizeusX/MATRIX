# MATRIX static preview

Open `index.html` locally or serve this directory with `python -m http.server 8000`.
The preview includes all 76 imported models, local primary photos, gallery links,
source descriptions and exact dimensions, search, category filters and favorites.
`catalog.js` must load before `app.js`; both work without a catalog API.

Additional gallery photos use the source website and require an Internet connection.
Prices and checkout are disabled. The hero/category artwork remains decorative.
Product names and descriptions retain the original Ukrainian text in both UI languages.

See [source audit](../docs/SOURCE_AUDIT.md) for the import and validation workflow.
Merging changes to master can trigger the existing GitHub Pages workflow.
