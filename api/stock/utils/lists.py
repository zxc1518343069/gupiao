"""股票与 ETF 列表拼装逻辑。"""

from services.stock_metadata import (
    build_stock_search_text,
    get_name_initials,
    get_stock_name,
    get_stock_raw_name,
    list_available_stock_codes,
)

from .filters import is_valid_etf, is_valid_stock


def build_security_summary(code: str, raw_name: str) -> dict:
    """拼装列表接口共用的证券摘要字段。"""
    display_name = get_stock_name(code, raw_name)
    return {
        "code": code,
        "name": display_name,
        "initials": get_name_initials(display_name),
        "search_text": build_stock_search_text(code, display_name, [raw_name]),
    }


def build_stock_list() -> list[dict]:
    """扫描本地可用代码并返回有效股票列表。"""
    valid_stocks = []
    for code in list_available_stock_codes():
        raw_name = get_stock_raw_name(code)
        if is_valid_stock(code, raw_name):
            valid_stocks.append(build_security_summary(code, raw_name))
    return valid_stocks


def build_etf_list() -> list[dict]:
    """扫描本地可用代码并返回有效 ETF 列表。"""
    valid_etfs = []
    for code in list_available_stock_codes():
        raw_name = get_stock_raw_name(code)
        if is_valid_etf(code, raw_name):
            valid_etfs.append(build_security_summary(code, raw_name))
    return valid_etfs
