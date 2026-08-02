import json
import re
import time
from urllib.parse import quote, urlparse, parse_qs

from selenium import webdriver
from selenium.webdriver.chrome.options import Options

QUERY = '메고지고 여수죽림점 여수'
EXPECTED_ROAD = '죽림3길 5-14'

options = Options()
options.add_argument('--headless=new')
options.add_argument('--no-sandbox')
options.add_argument('--disable-dev-shm-usage')
options.add_argument('--disable-gpu')
options.add_argument('--window-size=412,915')
options.add_argument('--lang=ko-KR')
options.add_argument('--disable-features=Translate,OptimizationHints')
options.add_argument('--user-agent=Mozilla/5.0 (Linux; Android 14; SM-S928N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0 Mobile Safari/537.36')
options.set_capability('goog:loggingPrefs', {'performance': 'ALL', 'browser': 'ALL'})
options.page_load_strategy = 'eager'

driver = webdriver.Chrome(options=options)
driver.set_page_load_timeout(25)

try:
    url = f'https://m.search.naver.com/search.naver?where=m&query={quote(QUERY)}'
    driver.get(url)
    time.sleep(5)
    html = driver.page_source
    links = driver.execute_script('return Array.from(document.querySelectorAll("a[href]"), a => ({href:a.href, text:(a.innerText||a.textContent||"").trim()}));')
    candidates = []
    seen = set()
    patterns = [
        re.compile(r'(?:m\.)?place\.naver\.com/(?:restaurant|place|hospital|hairshop|accommodation)/(\d+)', re.I),
        re.compile(r'map\.naver\.com/(?:p/)?entry/place/(\d+)', re.I),
        re.compile(r'(?:store|place)\.naver\.com/[^?]+\?(?:[^#]*&)?id=(\d+)', re.I),
    ]
    for link in links:
        href = link.get('href') or ''
        text = link.get('text') or ''
        place_id = ''
        for pattern in patterns:
            match = pattern.search(href)
            if match:
                place_id = match.group(1)
                break
        if not place_id:
            parsed = urlparse(href)
            qs = parse_qs(parsed.query)
            place_id = (qs.get('placeId') or qs.get('id') or [''])[0]
        if place_id and place_id.isdigit():
            key = (place_id, href)
            if key not in seen:
                seen.add(key)
                candidates.append({'placeId': place_id, 'href': href, 'text': text[:300]})

    text_matches = []
    for match in re.finditer(r'.{0,180}죽림3길\s*5-14.{0,300}', html, re.I | re.S):
        text_matches.append(re.sub(r'\s+', ' ', match.group(0))[:500])

    performance_urls = []
    for entry in driver.get_log('performance'):
        try:
            message = json.loads(entry['message'])['message']
        except Exception:
            continue
        if message.get('method') == 'Network.responseReceived':
            response = message.get('params', {}).get('response', {})
            response_url = response.get('url', '')
            if any(token in response_url.lower() for token in ('place', 'map', 'search')):
                performance_urls.append(response_url)

    result = {
        'requestedUrl': url,
        'currentUrl': driver.current_url,
        'title': driver.title,
        'htmlLength': len(html),
        'candidateCount': len(candidates),
        'candidates': candidates[:50],
        'expectedRoadFound': EXPECTED_ROAD.replace(' ', '') in re.sub(r'\s+', '', html),
        'textMatches': text_matches[:10],
        'browserLogs': driver.get_log('browser'),
        'performanceUrls': list(dict.fromkeys(performance_urls))[:100],
        'htmlPreview': re.sub(r'\s+', ' ', html[:5000])
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
finally:
    driver.quit()
