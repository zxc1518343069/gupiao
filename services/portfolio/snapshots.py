"""Portfolio snapshot builders backed by cached TDX analysis bundles."""

from database import SelfSelectedStock
from services.analyzer import (
    StockAnalysisBundle,
    get_close_on_or_before_date,
    get_stock_analysis_bundles,
)
from services.stock_metadata import get_price_precision


def calculate_portfolio_return(added_price: float | None, latest_price: float | None) -> float | None:
    """根据加入价格和最新价格计算持仓收益率。"""
    if added_price is None or latest_price is None or added_price == 0:
        return None
    return round((latest_price - added_price) / added_price * 100, 2)


def build_stock_portfolio_snapshot_from_bundle(
    stock_code: str,
    added_at,
    bundle: StockAnalysisBundle | None,
) -> dict:
    """基于已缓存的行情对象构造持仓快照，避免调用方再次读取 .day 文件。"""
    if bundle is None:
        return {"error": "行情数据文件不存在或无可用数据"}
    if bundle.error is not None:
        return {"error": bundle.error}

    price_precision = get_price_precision(stock_code)
    snapshot = dict(bundle.snapshot)
    added_price, added_price_date = get_close_on_or_before_date(
        bundle.dataframe,
        added_at,
        price_precision,
    )
    latest_price = snapshot.get("close")

    return {
        **snapshot,
        "added_price": added_price,
        "added_price_date": added_price_date,
        "latest_price": latest_price,
        "latest_price_date": snapshot.get("date"),
        "portfolio_return": calculate_portfolio_return(added_price, latest_price),
    }


def build_stock_portfolio_snapshots(stocks: list[SelfSelectedStock]) -> dict[str, dict]:
    """批量构造持仓快照；行情和指标会先进入 analyzer 的进程级缓存。"""
    stock_codes = [stock.stock_code for stock in stocks]
    bundles_by_code = get_stock_analysis_bundles(stock_codes)
    return {
        stock.stock_code: build_stock_portfolio_snapshot_from_bundle(
            stock.stock_code,
            stock.added_at,
            bundles_by_code.get(stock.stock_code),
        )
        for stock in stocks
    }


def get_stock_portfolio_snapshot(stock_code: str, added_at) -> dict:
    """构造单只股票持仓快照，用于新增或标签更新后的详情返回。"""
    bundle = get_stock_analysis_bundles([stock_code]).get(stock_code)
    return build_stock_portfolio_snapshot_from_bundle(stock_code, added_at, bundle)

