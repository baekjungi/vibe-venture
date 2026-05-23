"""
NEIS 급식식단정보 조회 콘솔 앱 (인터랙티브)

OpenAPI 명세: workshop/week-02/data/openapi.json
엔드포인트:  GET https://open.neis.go.kr/hub/mealServiceDietInfo

실행:
  python meal_service_cli.py
"""

from __future__ import annotations

import json
import sys
from datetime import datetime
from typing import Optional

import urllib.parse
import urllib.request


def masked_input(label: str) -> str:
    """입력 글자를 '*'로 마스킹하여 받는 함수 (Windows/Unix 호환)."""
    sys.stdout.write(label)
    sys.stdout.flush()

    buf: list[str] = []
    try:
        import msvcrt  # Windows
        while True:
            ch = msvcrt.getwch()
            if ch in ("\r", "\n"):
                sys.stdout.write("\n")
                sys.stdout.flush()
                break
            if ch == "\x03":  # Ctrl+C
                raise KeyboardInterrupt
            if ch == "\x08":  # Backspace
                if buf:
                    buf.pop()
                    sys.stdout.write("\b \b")
                    sys.stdout.flush()
                continue
            if ch == "\x00" or ch == "\xe0":
                msvcrt.getwch()  # 특수키(화살표 등) 소비
                continue
            buf.append(ch)
            sys.stdout.write("*")
            sys.stdout.flush()
    except ImportError:
        import termios
        import tty
        fd = sys.stdin.fileno()
        old = termios.tcgetattr(fd)
        try:
            tty.setraw(fd)
            while True:
                ch = sys.stdin.read(1)
                if ch in ("\r", "\n"):
                    sys.stdout.write("\r\n")
                    sys.stdout.flush()
                    break
                if ch == "\x03":
                    raise KeyboardInterrupt
                if ch in ("\x7f", "\x08"):
                    if buf:
                        buf.pop()
                        sys.stdout.write("\b \b")
                        sys.stdout.flush()
                    continue
                buf.append(ch)
                sys.stdout.write("*")
                sys.stdout.flush()
        finally:
            termios.tcsetattr(fd, termios.TCSADRAIN, old)

    return "".join(buf)


API_URL = "https://open.neis.go.kr/hub/mealServiceDietInfo"
DATE_INPUT_FORMAT = "%Y-%m-%d"
DATE_API_FORMAT = "%Y%m%d"


def prompt(label: str, *, required: bool = False, default: Optional[str] = None) -> Optional[str]:
    """공통 입력 함수. 빈 값이면 default 반환. required면 비어 있을 때 재요청."""
    suffix_parts = []
    if default is not None:
        suffix_parts.append(f"기본값: {default}")
    if not required:
        suffix_parts.append("엔터 시 생략")
    suffix = f" ({', '.join(suffix_parts)})" if suffix_parts else ""

    while True:
        try:
            value = input(f"{label}{suffix}: ").strip()
        except EOFError:
            print()
            sys.exit(1)

        if not value:
            if required and default is None:
                print("  → 필수 입력값입니다. 다시 입력하세요.")
                continue
            return default
        return value


def prompt_date(label: str, *, required: bool = False) -> Optional[str]:
    """yyyy-mm-dd 입력을 받아 YYYYMMDD 형식으로 변환."""
    while True:
        value = prompt(f"{label} (yyyy-mm-dd)", required=required)
        if value is None:
            return None
        try:
            return datetime.strptime(value, DATE_INPUT_FORMAT).strftime(DATE_API_FORMAT)
        except ValueError:
            print("  → 날짜 형식이 올바르지 않습니다. 예: 2024-03-04")


def prompt_int(label: str, *, default: int) -> int:
    while True:
        value = prompt(label, default=str(default))
        try:
            return int(value)
        except (TypeError, ValueError):
            print("  → 숫자를 입력하세요.")


def collect_inputs() -> dict:
    print("=" * 60)
    print("  NEIS 급식식단정보 조회")
    print("=" * 60)

    while True:
        key_value = masked_input("인증키(KEY): ").strip()
        if key_value:
            break
        print("  → 필수 입력값입니다. 다시 입력하세요.")

    params = {
        "KEY": key_value,
        "Type": "json",
        "ATPT_OFCDC_SC_CODE": prompt("시도교육청코드(ATPT_OFCDC_SC_CODE) 예: B10", required=True),
        "SD_SCHUL_CODE": prompt("행정표준코드(SD_SCHUL_CODE, 학교코드)", required=True),
        "MMEAL_SC_CODE": prompt("식사코드(MMEAL_SC_CODE) [1=조식, 2=중식, 3=석식]"),
        "MLSV_YMD": prompt_date("급식일자(MLSV_YMD)"),
        "MLSV_FROM_YMD": prompt_date("급식시작일자(MLSV_FROM_YMD)"),
        "MLSV_TO_YMD": prompt_date("급식종료일자(MLSV_TO_YMD)"),
        "pIndex": prompt_int("페이지 위치(pIndex)", default=1),
        "pSize": prompt_int("페이지 당 요청 숫자(pSize, 최대 1000)", default=100),
    }
    return params


def mask_key_in_url(url: str) -> str:
    """URL 쿼리스트링의 KEY 파라미터 값을 '*'로 마스킹."""
    parsed = urllib.parse.urlparse(url)
    qs = urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)
    masked = [(k, "*" * len(v) if k == "KEY" else v) for k, v in qs]
    new_query = urllib.parse.urlencode(masked)
    return urllib.parse.urlunparse(parsed._replace(query=new_query))


def call_api(params: dict) -> dict:
    query = urllib.parse.urlencode({k: v for k, v in params.items() if v is not None})
    url = f"{API_URL}?{query}"
    print(f"요청 URL: {mask_key_in_url(url)}\n")
    req = urllib.request.Request(url, headers={"User-Agent": "meal-service-cli/1.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        body = resp.read().decode("utf-8")
    return json.loads(body)


def extract_result(data: dict) -> tuple[Optional[dict], list[dict]]:
    result_meta: Optional[dict] = None
    rows: list[dict] = []

    if "mealServiceDietInfo" in data:
        for block in data["mealServiceDietInfo"]:
            if "head" in block:
                for h in block["head"]:
                    if "RESULT" in h:
                        result_meta = h["RESULT"]
            if "row" in block:
                rows.extend(block["row"])
    elif "RESULT" in data:
        result_meta = data["RESULT"]

    return result_meta, rows


def print_rows(rows: list[dict]) -> None:
    if not rows:
        print("조회된 급식 데이터가 없습니다.")
        return
    for i, row in enumerate(rows, 1):
        print("=" * 60)
        print(f"[{i}] {row.get('MLSV_YMD', '')}  {row.get('SCHUL_NM', '')}  ({row.get('MMEAL_SC_NM', '')})")
        print(f"  시도교육청 : {row.get('ATPT_OFCDC_SC_NM', '')} ({row.get('ATPT_OFCDC_SC_CODE', '')})")
        print(f"  학교코드   : {row.get('SD_SCHUL_CODE', '')}")
        print(f"  급식인원수 : {row.get('MLSV_FGR', '')}")
        dishes = (row.get("DDISH_NM") or "").replace("<br/>", "\n             ")
        print(f"  요리명     : {dishes}")
        cal = (row.get("CAL_INFO") or "").strip()
        if cal:
            print(f"  칼로리     : {cal}")
        ntr = (row.get("NTR_INFO") or "").replace("<br/>", " | ")
        if ntr:
            print(f"  영양정보   : {ntr}")
        orplc = (row.get("ORPLC_INFO") or "").replace("<br/>", " | ")
        if orplc:
            print(f"  원산지     : {orplc}")


def main() -> int:
    try:
        params = collect_inputs()
    except KeyboardInterrupt:
        print("\n취소되었습니다.")
        return 1

    print("\n조회 중...\n")
    try:
        data = call_api(params)
    except Exception as exc:
        print(f"[ERROR] API 호출 실패: {exc}", file=sys.stderr)
        return 2

    result_meta, rows = extract_result(data)

    if result_meta:
        code = result_meta.get("CODE", "")
        message = result_meta.get("MESSAGE", "")
        print(f"[RESULT] {code} - {message}\n")

    print_rows(rows)
    return 0


if __name__ == "__main__":
    sys.exit(main())
