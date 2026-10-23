"""Acquire only the versioned, hash-pinned HRA sources in the checked-in config.

Raw files stay in ignored .local/anatomy-sources/. This command neither publishes
assets nor grants anatomy/distribution approval. Use --verify-only for offline QA.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import tempfile
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / 'assets/sources/heart-hra.json'
RAW_ROOT = ROOT / '.local/anatomy-sources'
MAX_BYTES = 128 * 1024 * 1024
ALLOWED_HOSTS = {'cdn.humanatlas.io'}


def verify_url(url):
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != 'https' or parsed.hostname not in ALLOWED_HOSTS or parsed.username or parsed.password or parsed.port not in (None, 443):
        raise ValueError('Only the declared HTTPS HRA CDN source is supported: ' + url)


def digest_file(path):
    digest = hashlib.sha256()
    count = 0
    with path.open('rb') as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b''):
            count += len(chunk)
            if count > MAX_BYTES:
                raise ValueError('Source exceeds maximum allowed size')
            digest.update(chunk)
    return digest.hexdigest(), count


def acquire(source, verify_only):
    verify_url(source['url'])
    digest = source['sha256']
    if not re.fullmatch(r'[0-9a-f]{64}', digest):
        raise ValueError('Missing or invalid pinned SHA-256')
    destination = (ROOT / source['path']).resolve()
    if not destination.is_relative_to(RAW_ROOT.resolve()):
        raise ValueError('Raw source must remain under .local/anatomy-sources/')
    if destination.is_file():
        actual, size = digest_file(destination)
        if actual != digest or ('bytes' in source and size != source['bytes']):
            raise ValueError('Existing source differs from the pin; preserve and inspect it before reacquisition: ' + str(destination))
        print('PASS: source already matches pin: ' + source['key'])
        return
    if verify_only:
        raise FileNotFoundError(str(destination) + '; run python3 scripts/acquire-anatomy.py')
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        request = urllib.request.Request(source['url'], headers={'User-Agent': 'CardioLab-reproducible-asset-acquisition/1.0'})
        with urllib.request.urlopen(request, timeout=60) as response:
            verify_url(response.url)
            with tempfile.NamedTemporaryFile(dir=destination.parent, prefix='.download-', delete=False) as output:
                temporary = Path(output.name)
                count = 0
                while True:
                    chunk = response.read(1024 * 1024)
                    if not chunk:
                        break
                    count += len(chunk)
                    if count > MAX_BYTES:
                        raise ValueError('Download exceeds maximum size')
                    output.write(chunk)
                output.flush()
                os.fsync(output.fileno())
        actual, size = digest_file(temporary)
        if actual != digest or ('bytes' in source and size != source['bytes']):
            raise ValueError('Downloaded file does not match versioned source hash/size')
        if destination.exists():
            raise FileExistsError('Destination appeared during download; refusing to overwrite')
        temporary.replace(destination)
        temporary = None
        print('PASS: acquired verified source: ' + source['key'])
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--verify-only', action='store_true', help='Check existing source files without network access')
    args = parser.parse_args()
    config = json.loads(CONFIG.read_text())
    for source in config['sources']:
        acquire(source, args.verify_only)
    print('Source integrity passed; anatomical/project distribution review remains outstanding.')


if __name__ == '__main__':
    main()
