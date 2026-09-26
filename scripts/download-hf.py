"""Download daily Parquet into ignored local storage; never publish provider files.

Python 3.12+ and pyarrow==23.0.1 required. API key is read locally, never logged.
Run from the repository root. Cached files make retries and imports reproducible.
"""
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import sys
import threading
import time
import urllib.error
import urllib.request

sys.path.insert(0, str(Path('.local-data/python-deps').resolve()))
import pyarrow.parquet as pq

root = Path(__file__).resolve().parent.parent
cache = root / '.local-data/hf'
cache.mkdir(parents=True, exist_ok=True)
settings = json.loads((root / 'scripts/data/hf-universe.json').read_text())
key = os.environ.get('HF_DATA_API_KEY', '')
if not key and (root / '.env').exists():
    for line in (root / '.env').read_text(encoding='utf-8-sig').splitlines():
        if line.strip().startswith('HF_DATA_API_KEY='):
            key = line.split('=', 1)[1].strip().strip('\"\'')
if not key:
    raise SystemExit('Set HF_DATA_API_KEY locally before downloading.')

lock = threading.Lock()
last_request = 0.0

def request(url, authenticated=False):
    global last_request
    for attempt in range(3):
        with lock:
            time.sleep(max(0, 0.7 - (time.monotonic() - last_request)))
            last_request = time.monotonic()
        headers = {'User-Agent': 'StockDrawer/1.0'}
        if authenticated:
            headers['X-API-Key'] = key
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=90) as response:
                return response.read()
        except urllib.error.HTTPError as error:
            if error.code in (429, 500, 502, 503, 504) and attempt < 2:
                time.sleep(30 if error.code == 429 else 3)
                continue
            # Do not include URLs: signed download URLs contain credentials.
            raise RuntimeError(f'Provider HTTP {error.code}') from None
        except (urllib.error.URLError, TimeoutError):
            if attempt < 2:
                continue
            raise RuntimeError('Provider connection failed') from None

def download(ticker):
    path = cache / f'{ticker}.parquet'
    if not path.exists() or '--refresh' in sys.argv:
        token = json.loads(request(f'https://api.hfdatalibrary.com/v1/download-token/{ticker}?timeframe=daily&format=parquet&version=clean', True))
        url = token['url']
        if not url.startswith('https://api.hfdatalibrary.com/'):
            raise RuntimeError('Unexpected download host')
        content = request(url)
        temp = path.with_suffix('.part')
        temp.write_bytes(content)
        temp.replace(path)
    table = pq.read_table(path)
    required = {'datetime', 'Open', 'High', 'Low', 'Close', 'source'}
    if not required.issubset(table.column_names):
        raise RuntimeError('Missing daily price or source columns')
    rows = [dict(date=r['datetime'].strftime('%Y-%m-%d'), open=r['Open'], high=r['High'], low=r['Low'], close=r['Close'], source=r['source']) for r in table.to_pylist()]
    result = dict(ticker=ticker, sha256=hashlib.sha256(path.read_bytes()).hexdigest(), rows=rows)
    (cache / f'{ticker}.json').write_text(json.dumps(result, separators=(',', ':'), allow_nan=False), encoding='utf8')
    return len(rows)

failed = []
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    futures = {pool.submit(download, ticker): ticker for ticker in settings['tickers']}
    for future in concurrent.futures.as_completed(futures):
        ticker = futures[future]
        try:
            print(f'{ticker}: {future.result()} rows cached', flush=True)
        except Exception as error:
            failed.append(ticker)
            print(f'{ticker}: {str(error) if isinstance(error, RuntimeError) else type(error).__name__}', flush=True)
if failed:
    raise SystemExit('Incomplete download; retry before import: ' + ', '.join(failed))
print('Downloads complete. Run npm run data:bundle to validate and publish only eligible rows.')
