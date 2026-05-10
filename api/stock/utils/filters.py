"""股票与 ETF 代码过滤规则。"""

from services.stock_metadata import is_etf_code


def is_valid_stock_code(code: str) -> bool:
    """按市场前缀过滤 A 股股票代码。"""
    if code.startswith("sz"):
        num = code[2:]
        if not (num.startswith("00") or num.startswith("30")):
            return False
    elif code.startswith("sh"):
        num = code[2:]
        if not (num.startswith("60") or num.startswith("68")):
            return False
    elif code.startswith("bj"):
        num = code[2:]
        if not (num.startswith("43") or num.startswith("83") or num.startswith("87")):
            return False
    else:
        return False

    return True


def is_valid_stock(code: str, name: str) -> bool:
    """过滤非股票以及 ST、退市、异常名称标的。"""
    if not is_valid_stock_code(code):
        return False
    if "ST" in name or "退" in name or "PT" in name or "未知" in name:
        return False
    return True


def is_valid_etf_code(code: str) -> bool:
    """判断是否属于 ETF 代码段。"""
    return is_etf_code(code)


def is_valid_etf(code: str, name: str) -> bool:
    """过滤非 ETF 和异常名称。"""
    if not is_valid_etf_code(code):
        return False
    if "ETF" not in name.upper():
        return False
    if "退" in name or "未知" in name:
        return False
    return True
