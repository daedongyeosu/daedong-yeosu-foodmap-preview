import html as html_lib
import json
import re
import time
from pathlib import Path
from urllib.parse import quote, urlparse

from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.chrome.options import Options

INPUT_PATH = Path('data/ddangyo-new-store-services.json')
DATA = json.loads(INPUT_PATH.read_text(encoding='utf-8'))


def clean(value):
    return re.sub(r'\s+', ' ', html_lib.unescape(str(value or ''))).strip()


def decode_jsonish(value):
    raw = str(value or '')
    try:
        return clean(json.loads(f'"{raw}"'))
    except Exception:
        return clean(raw.replace('\\u002F', '/').replace('\\/', '/').replace('\\"', '"'))


def canonical_name(value):
    text = clean(value).lower()
    text = re.sub(r'\([^)]*\)', ' ', text)
    replacements = {
        '피나치공': '피자나라치킨공주',
        'only': '온리',
        '&': '앤',
        '순살 참잘튀기는집': '참잘튀기는집',
        '굽네치킨&피자': '굽네치킨피자',
    }
    for source, target in replacements.items():
        text = text.replace(source, target)
    return re.sub(r'[\s·()\-_/.,]', '', text)


def longest_common_substring_length(left, right):
    if not left or not right:
        return 0
    previous = [0] * (len(right) + 1)
    best = 0
    for left_char in left:
        current = [0] * (len(right) + 1)
        for index, right_char in enumerate(right, 1):
            if left_char == right_char:
                current[index] = previous[index - 1] + 1
                best = max(best, current[index])
        previous = current
    return best


def compatible_name(left, right):
    a = canonical_name(left)
    b = canonical_name(right)
    if not a or not b:
        return False
    if a == b or a in b or b in a:
        return True
    common = longest_common_substring_length(a, b)
    threshold = max(4, int(min(len(a), len(b)) * 0.6))
    return common >= threshold


def road_base(value):
    text = clean(value)
    text = re.sub(r'^대한민국\s*', '', text)
    text = re.sub(r'^전라남도\s*', '전남 ', text)
    text = re.sub(r'\s*\([^)]*\)\s*', ' ', text)
    text = re.sub(r'\s+(?:지하\s*)?\d+층(?:\s+.*)?$', '', text, flags=re.I)
    text = re.sub(r'\s+\d+(?:호|동)(?:\s+.*)?$', '', text, flags=re.I)
    return clean(text)


def road_signature(value):
    matches = list(re.finditer(r'([가-힣A-Za-z0-9]+(?:대로|로|길))\s*(\d+(?:-\d+)?)', road_base(value)))
    if not matches:
        return ''
    return f'{matches[-1].group(1)}{matches[-1].group(2)}'.lower()


def unique_rows(rows):
    output = []
    seen = set()
    for row in rows:
        key = (row.get('placeId'), row.get('name'), row.get('roadAddress'), row.get('address'))
        if key in seen:
            continue
        seen.add(key)
        output.append(row)
    return output


def extract_field(window, field_names):
    for field in field_names:
        patterns = [
            rf'"{re.escape(field)}"\s*:\s*"((?:\\.|[^"\\])*)"',
            rf'{re.escape(field)}\\?"?\s*:\s*\\?"((?:\\.|[^"\\])*)"',
        ]
        for pattern in patterns:
            match = re.search(pattern, window, re.I | re.S)
            if match:
                return decode_jsonish(match.group(1))
    return ''


def enrich_candidate_from_html(page_html, place_id, link_text=''):
    occurrences = [match.start() for match in re.finditer(re.escape(place_id), page_html)]
    best = {'placeId': place_id, 'name': clean(link_text), 'roadAddress': '', 'address': ''}
    for position in occurrences[:20]:
        window = page_html[max(0, position - 8000):position + 14000]
        candidate = {
            'placeId': place_id,
            'name': extract_field(window, ['normalizedName', 'name', 'businessName']) or best['name'],
            'roadAddress': extract_field(window, ['roadAddress', 'road_address', 'newAddress']),
            'address': extract_field(window, ['fullAddress', 'address', 'jibunAddress']),
        }
        if candidate['roadAddress']:
            return candidate
        if candidate['name'] and not best['name']:
            best['name'] = candidate['name']
        if candidate['address'] and not best['address']:
            best['address'] = candidate['address']
    return best


def make_driver():
    options = Options()
    options.add_argument('--headless=new')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-gpu')
    options.add_argument('--window-size=412,915')
    options.add_argument('--lang=ko-KR')
    options.add_argument('--disable-features=Translate,OptimizationHints')
    options.add_argument('--user-agent=Mozilla/5.0 (Linux; Android 14; SM-S928N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0 Mobile Safari/537.36')
    options.page_load_strategy = 'eager'
    driver = webdriver.Chrome(options=options)
    driver.set_page_load_timeout(30)
    return driver


def search_page(driver, query):
    url = f'https://m.search.naver.com/search.naver?where=m&query={quote(query)}'
    try:
        driver.get(url)
    except TimeoutException:
        pass
    time.sleep(2.8)
    page_html = driver.page_source
    links = driver.execute_script(
        'return Array.from(document.querySelectorAll("a[href]"), a => ({href:a.href, text:(a.innerText||a.textContent||"").trim()}));'
    )
    place_links = []
    seen = set()
    for link in links:
        href = link.get('href') or ''
        match = re.search(r'(?:m\.)?place\.naver\.com/(?:restaurant|place|hospital|hairshop|accommodation)/(\d+)', href, re.I)
        if not match:
            match = re.search(r'map\.naver\.com/(?:p/)?entry/place/(\d+)', href, re.I)
        if not match:
            continue
        place_id = match.group(1)
        if place_id in seen:
            continue
        seen.add(place_id)
        place_links.append({'placeId': place_id, 'href': href, 'text': clean(link.get('text'))})
    candidates = [enrich_candidate_from_html(page_html, link['placeId'], link['text']) for link in place_links]
    return {
        'query': query,
        'url': url,
        'candidateCount': len(candidates),
        'candidates': candidates,
        'htmlLength': len(page_html),
    }


def fill_candidate_from_place_page(driver, candidate):
    if candidate.get('roadAddress') and candidate.get('name'):
        return candidate
    place_id = candidate['placeId']
    url = f'https://m.place.naver.com/place/{place_id}/home'
    try:
        driver.get(url)
    except TimeoutException:
        pass
    time.sleep(2.3)
    page_html = driver.page_source
    filled = enrich_candidate_from_html(page_html, place_id, candidate.get('name', ''))
    return {
        'placeId': place_id,
        'name': filled.get('name') or candidate.get('name', ''),
        'roadAddress': filled.get('roadAddress') or candidate.get('roadAddress', ''),
        'address': filled.get('address') or candidate.get('address', ''),
    }


def resolve_row(driver, row):
    queries = [
        f"{row['name']} 여수",
        row['name'],
        f"{row['name']} {road_base(row['address'])}",
    ]
    attempts = []
    candidates = []
    for query in dict.fromkeys(clean(query) for query in queries if clean(query)):
        attempt = search_page(driver, query)
        attempts.append({'query': query, 'candidateCount': attempt['candidateCount'], 'url': attempt['url']})
        candidates.extend(attempt['candidates'])
        if candidates:
            break
    candidates = unique_rows(candidates)
    detailed = []
    for candidate in candidates[:8]:
        detailed.append(fill_candidate_from_place_page(driver, candidate))
    detailed = unique_rows(detailed)

    target_signature = road_signature(row['address'])
    same_address = [
        candidate for candidate in detailed
        if target_signature and road_signature(candidate.get('roadAddress') or candidate.get('address')) == target_signature
    ]
    exact = [candidate for candidate in same_address if compatible_name(candidate.get('name'), row['name'])]
    if len(exact) == 1:
        candidate = exact[0]
        return {
            'status': 'verified',
            'naverMap': f"https://map.naver.com/p/entry/place/{candidate['placeId']}",
            'candidate': candidate,
            'roadSignature': target_signature,
            'attempts': attempts,
            'sameAddressCandidates': same_address,
        }
    return {
        'status': 'ambiguous-exact-match' if len(exact) > 1 else 'no-exact-match',
        'naverMap': '',
        'roadSignature': target_signature,
        'attempts': attempts,
        'exactMatches': exact,
        'sameAddressCandidates': same_address,
        'candidates': detailed,
    }


driver = make_driver()
verified = 0
omitted = 0
try:
    for index, row in enumerate(DATA.get('stores', []), 1):
        try:
            result = resolve_row(driver, row)
            row['naverStatus'] = result['status']
            row['naverMap'] = result.get('naverMap', '')
            row['naverEvidence'] = result
            if result['status'] == 'verified':
                verified += 1
            else:
                omitted += 1
            print(f"{index}/{len(DATA['stores'])} {row['name']} -> {result['status']} {result.get('naverMap', '')}")
        except Exception as error:
            row['naverStatus'] = 'request-error'
            row['naverMap'] = ''
            row['naverEvidence'] = {'error': repr(error)}
            omitted += 1
            print(f"{index}/{len(DATA['stores'])} {row['name']} -> request-error {error!r}")
finally:
    driver.quit()

DATA['generatedAt'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
DATA['stats'] = {
    'newStores': len(DATA.get('stores', [])),
    'chakRoutes': len(DATA.get('stores', [])),
    'naverVerified': verified,
    'naverOmitted': omitted,
    'resolver': 'mobile-naver-search-browser',
}
INPUT_PATH.write_text(json.dumps(DATA, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(DATA['stats'], ensure_ascii=False, indent=2))
