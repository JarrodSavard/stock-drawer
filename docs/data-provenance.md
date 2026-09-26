# Historical data provenance review

Reviewed September 25, 2026. This is an engineering record of source evidence and the project's publication decision, not a legal determination.

## Publisher evidence

- Dataset: https://www.kaggle.com/datasets/camnugent/sandp500
- Publisher: Cam Nugent, dataset version 4, updated February 10, 2018.
- Public API metadata lists **CC0: Public Domain**.
- Metadata endpoint: https://www.kaggle.com/api/v1/datasets/view/camnugent/sandp500
- The description says the newest version switched acquisition to **The Investor's Exchange API** and references https://github.com/CNuge/kaggle_code/blob/master/stock_data/getSandP.py.
- Versioned download was accessible without credentials: https://www.kaggle.com/api/v1/datasets/download/camnugent/sandp500?datasetVersionNumber=4
- Downloaded ZIP: 20,283,917 bytes. Only the merged `all_stocks_5yr.csv` was extracted, without extracting arbitrary archive paths.

## Upstream restriction

[IEX API Exhibit A](https://iextrading.com/apiexhibita/) prohibits redistribution of API data received through a third party, and notes that API data includes third-party licensed data. That makes the Kaggle license label insufficient evidence to bundle these observations for a public commercial-capable demo.

[IEX HIST terms](https://www.iex.io/legal/hist-data-terms) permit redistribution with attribution for that separate historical-feed product. The Kaggle API-derived closing-price dataset has not been established as that product, so this project does not apply HIST rights to it.

## Decision and boundaries

- Keep downloaded prices and metadata in `.local-data/`, excluded from version control.
- CLI imports emit only local assets; `--publish` is blocked.
- Local Nuxt server binds to 127.0.0.1; its data endpoint is guarded by `import.meta.dev`.
- Static output includes provenance only. Visitors may select a CSV that is parsed in memory in their own browser; nothing is uploaded.
- This local-development choice does not assert additional redistribution or commercial rights.
- Revisit the default dataset only with documented upstream rights or a separately licensed source. Do not infer rights from a GitHub code license or replace observations with fake prices.

## Data integrity

Validated source CSV SHA-256: `6aea253cd19de60b568143991aaf1fa482456565c389205658d236e595e716cf`.

619,040 rows across 505 symbols and 1,259 observed dates, February 8, 2013 through February 7, 2018. The importer checks row structure, valid ISO dates, positive finite closes, ticker syntax, and conflicting duplicates. It constructs sorted session IDs and preserves missing per-stock observations. Price adjustment status is not established by this review; the UI and README say so.

Known limitations: historical constituent selection, no verified corporate-action adjustment, observed-date calendar rather than an independent exchange calendar, no price-quality guarantees, and no predictive interpretation of similarity.
