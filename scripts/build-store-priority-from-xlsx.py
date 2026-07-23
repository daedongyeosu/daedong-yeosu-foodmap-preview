#!/usr/bin/env python3
"""Build a non-sensitive store ownership priority map from the delivery-agency workbook.

Phone numbers are deliberately ignored: the agency workbook and canonical store data can
legitimately contain different numbers. Matching uses only store/branch names and the
neighborhood found in the workbook address. Ambiguous rows remain in the audit as review
items and are never promoted automatically.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from difflib import SequenceMatcher
from pathlib import Path

import openpyxl


INSTRUCTION_WORDS = (
    "포장완료", "포장완", "조리완료", "조리완", "정시완", "정신완", "즉시",
    "배차후", "잡고취소불가", "뒷골목에위치", "층", "상가", "앞", "쪽",
)

# Rows whose branch identity was manually checked against the canonical store name.
# A list is supported because one agency row can explicitly contain two shop-in-shop stores.
MANUAL_CANONICAL_NAMES = {
    3: ["본죽 여수국동점"],
    4: ["내조국 국밥 여수관문점"],
    5: ["하이오커피 여수교동점"],
    7: ["교촌치킨 국동점"],
    17: ["더벤티 여수국동항점"],
    18: ["우정통닭"],
    24: ["콩산소 (음식 연구소)"],
    28: ["이화수 전통 육개장"],
    30: ["굽네치킨&피자 문수점"],
    31: ["외계인피자 여수점"],
    32: ["아로이태국음식전문점"],
    34: ["공차 여서점"],
    36: ["정성이 가득찬 반찬"],
    38: ["김종구식 맛치킨 전기바베큐 옛날통닭 여서점"],
    40: ["토담 민속주점 문수점"],
    41: ["족팔계왕족발"],
    43: ["써브웨이 여서점"],
    46: ["백억 흑미 꼬마김밥"],
    47: ["맘스터치 문수점"],
    48: ["불로만치킨바베큐 여서점"],
    49: ["30년전통 할매손곰탕 문수점"],
    52: ["우사골설렁탕 여서동본점"],
    62: ["더리터 문수점"],
    59: ["노랑고래 찹쌀꽈배기 여수여서직영점"],
    63: ["쉐프의수제요리 야미야미 여서점"],
    69: ["아주커치킨 미평점"],
    70: ["다정아구 미평"],
    84: ["아주커치킨 둔덕점"],
    87: ["호(HO)분식 미평점"],
    88: ["손수김밥 양지점"],
    91: ["소풍 미평점"],
    92: ["한솥도시락 여수전남대점"],
    94: ["케이키팩토리"],
    95: ["맥시칸치킨 미평점"],
    98: ["맛집남도밀면"],
    104: ["청하대 영빈관 여서점"],
    105: ["와쭈 본점"],
    106: ["빵위에치즈 여수점"],
    107: ["피자스쿨 여문점"],
    109: ["조선제일 감자탕&뼈해장국 여서점"],
    110: ["다기야치킨 여문점"],
    113: ["두마리찜닭 두찜 여수문수점"],
    120: ["여수 돌산 꽈배기"],
    121: ["역전할머니맥주 봉산점"],
    138: ["비비큐 여수웅천점"],
    154: ["여수하늘"],
    164: ["가마치통닭 여수전남대점"],
    174: ["컴포즈커피 여수문수광장점"],
    175: ["롯데리아 이마트점"],
    170: ["늘 커피"],
    182: ["배스킨라빈스 여수미평점"],
    183: ["금마차 여서점"],
    193: ["철웅이네 입큰 붕어빵 문수점"],
    208: ["서희국밥&족발 국동본점"],
    211: ["커피샵붕어빵"],
    214: ["당빙땡 여수점"],
    217: ["정남옥 여수점"],
    218: ["덮덮밥 미평점", "삼첩분식 미평점"],
    221: ["리얼펍살얼음맥주 여수문수점"],
    223: ["정성집밥"],
    224: ["린차이나(먹깨비,땡겨요로 주문시 만두 서비스!!!)"],
    227: ["제육에 진심을 담아"],
    242: ["아주커치킨 미평점"],
    244: ["하이오커피 여수신월국동항점"],
}


def compact(value: object) -> str:
    text = str(value or "").lower().replace("&", "앤드")
    text = re.sub(r"\([^)]*\)", " ", text)
    for word in INSTRUCTION_WORDS:
        text = text.replace(word, " ")
    text = re.sub(r"(?:\d+분|\d+층|\d+차|\d+동)", " ", text)
    text = re.sub(r"[^0-9a-z가-힣]+", "", text)
    return text


def branchless(value: object) -> str:
    text = compact(value)
    text = re.sub(r"(?:여수)?(?:국동|관문|교동|봉산|덕충|수정|문수|여서|오림|미평|둔덕|봉계|웅천|신월|국포|중앙|학동|무선|여천|돌산|죽림|서교|고소|봉강|공화|충무|남산)(?:동)?(?:점|직영점|본점)?", "", text)
    text = re.sub(r"(?:여수)?(?:점|직영점|본점)$", "", text)
    return text


def neighborhood(value: object) -> str:
    match = re.search(r"([가-힣]+(?:동|면|읍))", str(value or ""))
    return match.group(1) if match else ""


def area_key(value: object) -> str:
    return re.sub(r"(?:동|면|읍)$", "", compact(value))


def store_neighborhoods(store: dict) -> set[str]:
    values = [store.get("district"), store.get("address"), store.get("name"), store.get("branchName")]
    result: set[str] = set()
    for value in values:
        text = str(value or "")
        result.update(area_key(item) for item in re.findall(r"([가-힣]+(?:동|면|읍))", text))
    for part in re.split(r"[,/·]", str(store.get("district") or "")):
        if part.strip():
            result.add(area_key(part))
    return result


def score_candidate(excel_name: str, excel_neighborhood: str, store: dict) -> tuple[float, bool]:
    left, right = compact(excel_name), compact(store.get("name"))
    left_base, right_base = branchless(excel_name), branchless(store.get("name"))
    excel_area_key = area_key(excel_neighborhood)
    same_area = bool(excel_area_key and (excel_area_key in store_neighborhoods(store) or excel_area_key in compact(store.get("name"))))
    exact = left == right
    contains = min(len(left_base), len(right_base)) >= 4 and (left_base in right_base or right_base in left_base)
    ratio = SequenceMatcher(None, left_base, right_base).ratio()
    score = ratio + (0.22 if same_area else 0) + (0.35 if exact else 0) + (0.16 if contains else 0)
    return score, same_area


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--xlsx", required=True)
    parser.add_argument("--stores", default="data/stores.json")
    parser.add_argument("--output", default="data/store-priority.json")
    parser.add_argument("--audit", default="data/store-priority-audit.csv")
    args = parser.parse_args()

    stores = json.loads(Path(args.stores).read_text(encoding="utf-8"))
    by_exact_name = {store["name"]: store for store in stores}
    workbook = openpyxl.load_workbook(args.xlsx, read_only=True, data_only=True)
    sheet = workbook.active
    rows = sheet.iter_rows(values_only=True)
    headers = [str(value or "") for value in next(rows)]
    columns = {name: index for index, name in enumerate(headers)}

    managed_ids: list[str] = []
    audit: list[dict] = []
    matched_excel_rows = 0

    for excel_row, row in enumerate(rows, start=2):
        if str(row[columns["상태"]] or "").strip() != "운영":
            continue
        excel_name = str(row[columns["가맹점명"]] or "").strip()
        area = neighborhood(row[columns["가맹점 주소"]])
        selected: list[dict] = []
        decision = "not-in-canonical"
        confidence = ""

        # The exported workbook has a one-row UI/export offset compared with its visible
        # row labels, so the reviewed list uses the visible row number (excel_row + 1).
        manual_names = MANUAL_CANONICAL_NAMES.get(excel_row + 1)
        if manual_names:
            selected = [by_exact_name[name] for name in manual_names if name in by_exact_name]
            decision = "managed-safe-manual" if selected else "manual-target-missing"
            confidence = "manual-name-and-branch"
        else:
            ranked = []
            for store in stores:
                score, same_area = score_candidate(excel_name, area, store)
                ranked.append((score, same_area, store))
            ranked.sort(key=lambda item: (-item[0], item[2]["name"]))
            best, second = ranked[0], ranked[1]
            margin = best[0] - second[0]
            left, right = compact(excel_name), compact(best[2]["name"])
            left_base, right_base = branchless(excel_name), branchless(best[2]["name"])
            exact = left == right
            contains = min(len(left_base), len(right_base)) >= 4 and (left_base in right_base or right_base in left_base)
            safe = (
                (exact and (best[1] or margin >= 0.18))
                or (best[1] and contains and best[0] >= 1.22 and margin >= 0.09)
                or (best[1] and best[0] >= 1.10 and margin >= 0.15)
            )
            if safe:
                selected = [best[2]]
                decision = "managed-safe-auto"
                confidence = f"name-and-neighborhood:{best[0]:.3f};margin:{margin:.3f}"
            elif best[0] >= 0.84:
                decision = "needs-review"
                confidence = f"candidate:{best[0]:.3f};margin:{margin:.3f}"

        if selected:
            matched_excel_rows += 1
        for store in selected:
            if store["id"] not in managed_ids:
                managed_ids.append(store["id"])
        audit.append({
            "excel_row": excel_row,
            "excel_store_name": excel_name,
            "excel_neighborhood": area,
            "canonical_store_ids": "|".join(store["id"] for store in selected),
            "canonical_store_names": "|".join(store["name"] for store in selected),
            "decision": decision,
            "match_basis": confidence,
        })

    payload = {
        "schemaVersion": 1,
        "source": "꼬르륵 전체가게(1).xlsx",
        "matchingPolicy": "store-and-branch-name plus address neighborhood; phone numbers ignored",
        "managedStoreIds": managed_ids,
        "sharedManagedStoreIds": [],
        "stats": {
            "operatingExcelRows": len(audit),
            "matchedExcelRows": matched_excel_rows,
            "managedCanonicalStores": len(managed_ids),
            "sharedManagedCanonicalStores": 0,
            "needsReviewRows": sum(row["decision"] == "needs-review" for row in audit),
            "unmatchedRows": sum(row["decision"] in {"not-in-canonical", "manual-target-missing"} for row in audit),
        },
    }
    Path(args.output).write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    with Path(args.audit).open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(audit[0]))
        writer.writeheader()
        writer.writerows(audit)
    print(json.dumps(payload["stats"], ensure_ascii=False))


if __name__ == "__main__":
    main()
