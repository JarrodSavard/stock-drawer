# Historical data provenance

Reviewed September 26, 2026. This records source evidence and the engineering publication policy.

## Public snapshot

The app includes 100 selected stocks and 114,299 daily observations from March 7, 2022 through September 24, 2026. This is a curated sample, not current S&P 500 membership or a live feed. Original daily OHLC observations are retained; no prices are fabricated, rounded, or filled across gaps.

Source: **Ahmed Elkassabgi (2026), HF Data Library**, https://hfdatalibrary.com/, https://doi.org/10.5281/zenodo.19501605.

- [Provider license](https://hfdatalibrary.com/pages/license): CC BY 4.0 covers the compilation and documentation; IEX retains rights to its underlying securities information.
- [Provider source disclosure](https://hfdatalibrary.com/pages/issues): rows marked `source="iex"` come from IEX Exchange HIST. Older PiTrading rows and untagged/reprocessing rows have different provenance and are excluded.
- [IEX HIST terms](https://www.iex.io/legal/hist-data-terms) permit distribution subject to attribution and their conditions. These are distinct from the IEX API terms applicable to the earlier Kaggle source.
- [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/): credit the compilation, link its license, and identify modifications. Stock Drawer's all-rights-reserved code license does not restrict third-party data; see the exception in the root LICENSE.

**Data provided for free by IEX. By accessing or using IEX Historical Data, you agree to the [IEX Historical Data Terms of Use](https://www.iex.io/legal/hist-data-terms).**

Attribution is included in the app's source details, this document, `public/data/source.json`, and within `public/data/history.json` itself so it travels with the price asset.

## Reproducible acquisition and transformation

1. The fixed selection and cutoff live in `scripts/data/hf-universe.json`. No provider API runs in the browser or during normal hosting builds.
2. `scripts/download-hf.py` reads a local `HF_DATA_API_KEY` and downloads the provider's **clean, daily Parquet** files using authenticated download tokens. The documented daily CSV option returned 404 on review; Parquet was verified to work.
3. Original Parquet and converted JSON rows remain in ignored `.local-data/hf/`. Tokens and keys are never written into published files or printed. Cached files can be reused; `--refresh` explicitly refreshes them.
4. `npm run data:bundle` verifies source file checksums, then the pure `shared/hf-importer.ts` boundary requires source tags and valid dates. Only exact `source="iex"` rows from March 7, 2022 through the configured cutoff can reach the output. Unknown sources and other periods are excluded; missing provenance fails the import.
5. Eligible OHLC values must be finite, positive and internally consistent. The shared CSV importer rejects conflicting duplicates, sorts observations and preserves session gaps. Tickers without any eligible observations fail publication. Short histories remain short; the matcher excludes incomplete windows.
6. The manifest records the cutoff, actual coverage, counts, exclusions, original Parquet SHA-256 values, and output SHA-256. The initial import excluded 449,532 rows outside this publication policy.

Re-running the importer over cached inputs reproduces the price asset byte-for-byte. The manifest's review date can change. To update history, revise the cutoff, refresh downloads, inspect provenance, regenerate the snapshot, and run all checks before committing it. Credentials are unnecessary for serving or building the checked-in snapshot, so expiration of the provider key does not break the site.

## Data limitations

These bars reflect **IEX-only trading**, not the consolidated US market or its official closing print. Provider cleaning may remove outliers. The provider documents incomplete handling of trade-break corrections. Corporate-action adjustments have not been independently verified; prices are used as supplied in the clean version.

The observed union calendar breaks windows when an individual stock is missing a session. A session absent from every selected stock cannot be inferred. Coverage and selection biases remain; more historical shapes do not establish predictive accuracy. Imported visitor CSVs stay in the browser and have their own provenance and terms.

## Earlier Kaggle development source — excluded

[Cam Nugent's S&P 500 dataset](https://www.kaggle.com/datasets/camnugent/sandp500), version 4, was used privately during development. It contains 619,040 rows across 505 historical tickers, February 8, 2013–February 7, 2018. CSV SHA-256: `6aea253cd19de60b568143991aaf1fa482456565c389205658d236e595e716cf`.

Kaggle metadata labels it CC0, but the publisher identifies the IEX API as its upstream source. [IEX API Exhibit A](https://iextrading.com/apiexhibita/) restricts redistribution of API data received through third parties. The separate HIST rights cannot be assumed for those observations. They remain ignored in `.local-data/`; the generic CSV CLI stays local-only and refuses `--publish`. Neither `public/data/stocks.json` nor the development API is included in the static build. The app now loads only the cleared `history.json` snapshot by default in both development and production.
