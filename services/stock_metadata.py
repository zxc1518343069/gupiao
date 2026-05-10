"""
股票元数据加载服务。

这里统一处理两类信息：
1. 股票名称：从通达信本地 `hq_cache` 解析。
2. 可用代码：从 `vipdoc/<market>/lday/*.day` 扫描当前实际存在的数据文件。

这样接口层和分析脚本都不需要关心名称来源细节，只调用这里的统一方法即可。
"""

from functools import lru_cache
from pathlib import Path

from config import TDX_HQ_CACHE_PATH, TDX_VIPDOC_PATH

MARKET_NAME_FILES = {
    "sz": "szs.tnf",
    "sh": "shs.tnf",
    "bj": "bjs.tnf",
}
INFOHARBOR_CODE_FILE = "infoharbor_ex.code"
INFOHARBOR_NAME_FILE = "infoharbor_ex.name"
SH_ETF_CODE_PREFIXES = ("51", "56", "58")
SZ_ETF_CODE_PREFIXES = ("15",)
TRADING_NAME_PREFIXES = ("XD", "DR", "XR", "N", "C")

TDX_RECORD_SIZE = 360
TDX_CODE_OFFSET = 50
TDX_NAME_OFFSET = 81
TDX_NAME_END = 112
MARKET_FLAG_TO_PREFIX = {
    "0": "sz",
    "1": "sh",
    "2": "bj",
}
TDX_INDUSTRY_NAME_FILES = ("tdxzs3.cfg", "tdxzs.cfg")

PINYIN_INITIAL_RANGES = [
    (-20319, "a"),
    (-20284, "b"),
    (-19776, "c"),
    (-19219, "d"),
    (-18711, "e"),
    (-18527, "f"),
    (-18240, "g"),
    (-17923, "h"),
    (-17418, "j"),
    (-16475, "k"),
    (-16213, "l"),
    (-15641, "m"),
    (-15166, "n"),
    (-14923, "o"),
    (-14915, "p"),
    (-14631, "q"),
    (-14150, "r"),
    (-14091, "s"),
    (-13319, "t"),
    (-12839, "w"),
    (-12557, "x"),
    (-11848, "y"),
    (-11056, "z"),
]


def _parse_tdx_name_file(file_path: Path, market: str) -> dict[str, str]:
    """
    解析通达信 `.tnf` 名称文件。

    当前项目只关心两段固定偏移：
    - `50:56` 为 6 位证券代码
    - `81:112` 为 GBK 编码的证券名称
    """
    if not file_path.exists():
        return {}

    stock_names: dict[str, str] = {}
    with file_path.open("rb") as file:
        while True:
            record = file.read(TDX_RECORD_SIZE)
            if len(record) < TDX_RECORD_SIZE:
                break

            code = record[TDX_CODE_OFFSET:TDX_CODE_OFFSET + 6]
            stock_code = code.split(b"\x00", 1)[0].decode("ascii", "ignore").strip()
            if len(stock_code) != 6 or not stock_code.isdigit():
                continue

            raw_name = record[TDX_NAME_OFFSET:TDX_NAME_END]
            stock_name = raw_name.split(b"\x00", 1)[0].decode("gbk", "ignore").strip()
            if not stock_name:
                continue

            stock_names[f"{market}{stock_code}"] = stock_name

    return stock_names


def _parse_bj_legacy_names(file_path: Path) -> dict[str, str]:
    """
    补充北交所旧代码名称。

    通达信在 `addedcode_bj.cfg` 中维护了一部分北交所旧代码到新代码的关系，
    对于只保留旧代码 `.day` 文件的场景，这里直接提取旧代码名称，避免名称缺失。
    """
    if not file_path.exists():
        return {}

    stock_names: dict[str, str] = {}
    for line in file_path.read_text(encoding="gbk", errors="ignore").splitlines():
        parts = line.strip().split("|")
        if len(parts) < 4:
            continue

        legacy_code = parts[1].strip()
        raw_name = parts[3].strip()
        if len(legacy_code) != 6 or not legacy_code.isdigit():
            continue
        if not raw_name:
            continue

        stock_name = raw_name.split("(", 1)[0].strip()
        if stock_name:
            stock_names[f"bj{legacy_code}"] = stock_name

    return stock_names


def _infer_market_from_plain_code(stock_code: str) -> str | None:
    if len(stock_code) != 6 or not stock_code.isdigit():
        return None

    if stock_code.startswith(("00", "30", "15")):
        return "sz"
    if stock_code.startswith(("60", "68", "51", "56", "58")):
        return "sh"
    if stock_code.startswith(("43", "83", "87", "92")):
        return "bj"
    return None


def _compose_stock_code(market_flag: str, code: str) -> str | None:
    market = MARKET_FLAG_TO_PREFIX.get(market_flag.strip())
    stock_code = code.strip()
    if market is None or len(stock_code) != 6 or not stock_code.isdigit():
        return None
    return f"{market}{stock_code}"


def _parse_infoharbor_code_file(file_path: Path) -> dict[str, str]:
    """解析扩展代码表，提取更稳定的证券简称。"""
    if not file_path.exists():
        return {}

    alias_names: dict[str, str] = {}
    for line in file_path.read_text(encoding="gbk", errors="ignore").splitlines():
        parts = line.strip().split("|")
        if len(parts) < 2:
            continue

        plain_code = parts[0].strip()
        alias_name = parts[1].strip()
        market = _infer_market_from_plain_code(plain_code)
        if market is None or not alias_name:
            continue

        alias_names[f"{market}{plain_code}"] = alias_name

    return alias_names


def _parse_infoharbor_name_file(file_path: Path) -> dict[str, str]:
    """解析扩展名称表，提取更完整的证券名称。"""
    if not file_path.exists():
        return {}

    full_names: dict[str, str] = {}
    for line in file_path.read_text(encoding="gbk", errors="ignore").splitlines():
        parts = line.strip().split("|")
        if len(parts) < 3:
            continue

        stock_code = _compose_stock_code(parts[0], parts[1])
        full_name = parts[2].strip()
        if stock_code and full_name:
            full_names[stock_code] = full_name

    return full_names


def _parse_specgpext_file(file_path: Path) -> dict[str, str]:
    """解析通达信股票扩展信息，提取主营/简介短句。"""
    if not file_path.exists():
        return {}

    stock_intros: dict[str, str] = {}
    for line in file_path.read_text(encoding="gbk", errors="ignore").splitlines():
        parts = line.strip().split("|")
        if len(parts) < 3:
            continue

        stock_code = _compose_stock_code(parts[0], parts[1])
        intro = parts[2].strip()
        if stock_code and intro:
            stock_intros[stock_code] = intro

    return stock_intros


def _parse_industry_name_files(hq_cache_path: Path) -> dict[str, str]:
    """解析行业代码到行业名称的映射。"""
    industry_names: dict[str, str] = {}

    for filename in TDX_INDUSTRY_NAME_FILES:
        file_path = hq_cache_path / filename
        if not file_path.exists():
            continue

        for line in file_path.read_text(encoding="gbk", errors="ignore").splitlines():
            parts = line.strip().split("|")
            if len(parts) < 6:
                continue

            industry_name = parts[0].strip()
            industry_code = parts[-1].strip()
            if industry_name and industry_code:
                industry_names[industry_code] = industry_name

    return industry_names


def _parse_stock_industry_file(file_path: Path) -> dict[str, dict[str, str | None]]:
    """解析股票到行业代码的映射。"""
    if not file_path.exists():
        return {}

    stock_industries: dict[str, dict[str, str | None]] = {}
    for line in file_path.read_text(encoding="gbk", errors="ignore").splitlines():
        parts = line.strip().split("|")
        if len(parts) < 3:
            continue

        stock_code = _compose_stock_code(parts[0], parts[1])
        if stock_code is None:
            continue

        industry_codes = [part.strip() for part in parts[2:] if part.strip()]
        if not industry_codes:
            continue

        stock_industries[stock_code] = {
            "industry_code": industry_codes[0],
            "industry_detail_code": industry_codes[-1] if len(industry_codes) > 1 else None,
        }

    return stock_industries


@lru_cache(maxsize=1)
def load_stock_names() -> dict[str, str]:
    """
    加载通达信主名称表。

    加载顺序是：
    1. 通达信 `szs.tnf / shs.tnf / bjs.tnf`
    2. 北交所旧代码补充文件 `addedcode_bj.cfg`

    后加载的数据会覆盖前面的同代码旧值，确保优先使用通达信本地最新名称。
    """
    stock_names: dict[str, str] = {}
    hq_cache_path = Path(TDX_HQ_CACHE_PATH)

    for market, filename in MARKET_NAME_FILES.items():
        stock_names.update(_parse_tdx_name_file(hq_cache_path / filename, market))

    stock_names.update(_parse_bj_legacy_names(hq_cache_path / "addedcode_bj.cfg"))
    return stock_names


@lru_cache(maxsize=1)
def load_stock_alias_names() -> dict[str, str]:
    """加载扩展简称表，用于兜底修正 `XD金盘科` 这类交易所短简称。"""
    hq_cache_path = Path(TDX_HQ_CACHE_PATH)
    return _parse_infoharbor_code_file(hq_cache_path / INFOHARBOR_CODE_FILE)


@lru_cache(maxsize=1)
def load_stock_full_names() -> dict[str, str]:
    """加载扩展全称表，主要用于补齐 ETF 被截断的名称。"""
    hq_cache_path = Path(TDX_HQ_CACHE_PATH)
    return _parse_infoharbor_name_file(hq_cache_path / INFOHARBOR_NAME_FILE)


@lru_cache(maxsize=1)
def load_stock_profiles() -> dict[str, dict[str, str | None]]:
    """
    加载股票简介和行业分类。

    数据来源：
    1. `specgpext.txt` 中的主营/业务短句
    2. `tdxhy.cfg` 中的股票行业代码
    3. `tdxzs3.cfg / tdxzs.cfg` 中的行业代码名称
    """
    hq_cache_path = Path(TDX_HQ_CACHE_PATH)
    stock_intros = _parse_specgpext_file(hq_cache_path / "specgpext.txt")
    stock_industries = _parse_stock_industry_file(hq_cache_path / "tdxhy.cfg")
    industry_names = _parse_industry_name_files(hq_cache_path)

    stock_codes = set(stock_intros) | set(stock_industries)
    profiles: dict[str, dict[str, str | None]] = {}

    for stock_code in stock_codes:
        industry_meta = stock_industries.get(stock_code, {})
        industry_name = industry_names.get(str(industry_meta.get("industry_code") or ""))
        industry_detail = industry_names.get(str(industry_meta.get("industry_detail_code") or ""))

        industry_parts = []
        if industry_name:
            industry_parts.append(industry_name)
        if industry_detail and industry_detail != industry_name:
            industry_parts.append(industry_detail)

        profiles[stock_code] = {
            "company_intro": stock_intros.get(stock_code),
            "industry_name": industry_name,
            "industry_detail": industry_detail,
            "industry_display": " / ".join(industry_parts) if industry_parts else None,
        }

    return profiles


@lru_cache(maxsize=1)
def list_available_stock_codes() -> list[str]:
    """扫描本地 `.day` 文件，返回当前实际有行情数据的证券代码列表。"""
    available_codes: set[str] = set()
    vipdoc_path = Path(TDX_VIPDOC_PATH)

    for market in MARKET_NAME_FILES:
        day_dir = vipdoc_path / market / "lday"
        if not day_dir.exists():
            continue

        for file_path in day_dir.glob(f"{market}*.day"):
            stock_code = file_path.stem.lower()
            if len(stock_code) == 8 and stock_code.startswith(market):
                available_codes.add(stock_code)

    return sorted(available_codes)


def get_stock_raw_name(stock_code: str, fallback_name: str | None = None) -> str:
    """返回通达信主名称表中的原始简称。"""
    return load_stock_names().get(stock_code, fallback_name or "未知")


def get_stock_name(stock_code: str, fallback_name: str | None = None) -> str:
    """返回前端展示/搜索时更稳定的证券简称。"""
    raw_name = get_stock_raw_name(stock_code, fallback_name)
    alias_name = load_stock_alias_names().get(stock_code)
    full_name = load_stock_full_names().get(stock_code)

    if is_etf_code(stock_code) and full_name and len(full_name) > len(raw_name):
        return full_name

    if not alias_name:
        return raw_name
    if any(flag in raw_name for flag in ("ST", "PT", "退")):
        return raw_name
    return alias_name


def is_etf_code(stock_code: str) -> bool:
    """按交易所代码段判断是否为 ETF / 场内基金行情。"""
    normalized_code = str(stock_code or "").strip().lower()
    if normalized_code.startswith("sh"):
        return normalized_code[2:].startswith(SH_ETF_CODE_PREFIXES)
    if normalized_code.startswith("sz"):
        return normalized_code[2:].startswith(SZ_ETF_CODE_PREFIXES)
    return False


def get_price_scale_divisor(stock_code: str) -> float:
    """
    返回通达信 `.day` 价格字段的缩放系数。

    股票通常按 `100` 缩放；ETF / 场内基金通常按 `1000` 缩放。
    """
    return 1000.0 if is_etf_code(stock_code) else 100.0


def get_price_precision(stock_code: str) -> int:
    """返回前端展示/分析时建议保留的价格小数位数。"""
    return 3 if is_etf_code(stock_code) else 2


def infer_asset_type(stock_code: str) -> str:
    """按代码推断当前标的类型。"""
    return "etf" if is_etf_code(stock_code) else "stock"


def get_stock_profile(stock_code: str) -> dict[str, str | None]:
    """按统一元数据表查询单只股票的简介和行业信息。"""
    return load_stock_profiles().get(
        stock_code,
        {
            "company_intro": None,
            "industry_name": None,
            "industry_detail": None,
            "industry_display": None,
        },
    )


def get_name_initials(text: str) -> str:
    """
    生成名称首字母简写，便于 `zjxc` 这类快速筛选。

    规则：
    - ASCII 字母/数字直接保留为小写
    - 中文字符按 GBK 区位映射为拼音首字母
    - 其他字符跳过
    """
    initials: list[str] = []

    for char in text.strip():
        if char.isascii():
            if char.isalnum():
                initials.append(char.lower())
            continue

        try:
            gbk_bytes = char.encode("gbk")
        except UnicodeEncodeError:
            continue

        if len(gbk_bytes) != 2:
            continue

        code = gbk_bytes[0] * 256 + gbk_bytes[1] - 65536
        for boundary, initial in reversed(PINYIN_INITIAL_RANGES):
            if code >= boundary:
                initials.append(initial)
                break

    return "".join(initials)


def _strip_trading_name_prefix(stock_name: str) -> str:
    cleaned_name = str(stock_name or "").strip()
    uppercase_name = cleaned_name.upper()
    for prefix in TRADING_NAME_PREFIXES:
        if uppercase_name.startswith(prefix) and len(cleaned_name) > len(prefix):
            return cleaned_name[len(prefix):].strip()
    return cleaned_name


def _normalize_code_for_search(stock_code: str) -> str:
    normalized_code = str(stock_code or "").strip().lower()
    if len(normalized_code) > 2 and normalized_code[:2] in MARKET_NAME_FILES:
        return normalized_code[2:]
    return normalized_code


def build_stock_search_text(
    stock_code: str,
    stock_name: str,
    extra_names: list[str] | None = None,
) -> str:
    """构建统一搜索文本，供前端按代码、名称、首字母简写筛选。"""
    search_parts: list[str] = [
        str(stock_code or "").strip().lower(),
        _normalize_code_for_search(stock_code),
    ]

    for current_name in [stock_name, *(extra_names or [])]:
        normalized_name = str(current_name or "").strip()
        if not normalized_name:
            continue

        stripped_name = _strip_trading_name_prefix(normalized_name)
        search_parts.extend(
            [
                normalized_name.lower(),
                get_name_initials(normalized_name),
            ]
        )

        if stripped_name and stripped_name != normalized_name:
            search_parts.extend(
                [
                    stripped_name.lower(),
                    get_name_initials(stripped_name),
                ]
            )

    deduplicated_parts: list[str] = []
    seen_parts: set[str] = set()
    for part in search_parts:
        normalized_part = str(part or "").strip().lower()
        if not normalized_part or normalized_part in seen_parts:
            continue
        seen_parts.add(normalized_part)
        deduplicated_parts.append(normalized_part)

    return " ".join(deduplicated_parts)
