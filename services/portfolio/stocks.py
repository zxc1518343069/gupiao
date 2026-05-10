"""Portfolio stock list use cases."""

from sqlalchemy.orm import Query, Session

from database import SelfSelectedStock, StockGroupMembership

from .constants import (
    ASSET_TYPE_ALL,
    DEFAULT_GROUP_NAME,
    DEFAULT_GROUP_PARAMS,
    INDUSTRY_GROUP_PARAMS,
    PORTFOLIO_GROUP_PARAMS,
)
from .groups import get_stock_group_names_by_codes
from .normalizers import normalize_asset_type, normalize_group_params
from .serializers import serialize_portfolio_stock
from .snapshots import build_stock_portfolio_snapshots


def _get_membership_stock_codes(
    db: Session,
    params: int,
    group_name: str | None = None,
) -> list[str]:
    """按分组类型和可选分组名读取股票代码，用于收窄主表查询范围。"""
    query = db.query(StockGroupMembership.stock_code).filter(
        StockGroupMembership.params == params,
    )
    if group_name:
        query = query.filter(StockGroupMembership.group_name == group_name)

    return [row[0] for row in query.all()]


def _apply_asset_type_filter(query: Query, asset_type: str) -> Query:
    """根据资产类型筛选股票；all 表示不过滤。"""
    if asset_type == ASSET_TYPE_ALL:
        return query
    return query.filter(SelfSelectedStock.asset_type == asset_type)


def _apply_group_filter(
    db: Session,
    query: Query,
    params: int,
    group_name: str | None,
) -> Query | None:
    """把自选视角或行业视角转换成 SQL 条件；None 表示目标分组为空。"""
    if params == INDUSTRY_GROUP_PARAMS:
        stock_codes = _get_membership_stock_codes(db, INDUSTRY_GROUP_PARAMS, group_name)
        if not stock_codes:
            return None
        return query.filter(SelfSelectedStock.stock_code.in_(stock_codes))

    if group_name == DEFAULT_GROUP_NAME or not group_name:
        return query.filter(SelfSelectedStock.is_self_selected.is_(True))

    stock_codes = _get_membership_stock_codes(db, PORTFOLIO_GROUP_PARAMS, group_name)
    if not stock_codes:
        return None
    return query.filter(SelfSelectedStock.stock_code.in_(stock_codes))


def _query_portfolio_stocks(
    db: Session,
    params: int,
    group_name: str | None,
    asset_type: str,
) -> list[SelfSelectedStock]:
    """完成列表接口的 SQL 条件拼接，并返回排序后的股票记录。"""
    query = db.query(SelfSelectedStock).order_by(SelfSelectedStock.added_at.desc())
    query = _apply_asset_type_filter(query, asset_type)
    query = _apply_group_filter(db, query, params, group_name)
    if query is None:
        return []

    return query.all()


def list_portfolio_stocks(
    db: Session,
    params: int = DEFAULT_GROUP_PARAMS,
    group_name: str | None = None,
    asset_type: str | None = None,
) -> list[dict]:
    """返回自选/行业股票列表，并附带当前行情快照和分组展示字段。"""
    normalized_params = normalize_group_params(params)
    normalized_asset_type = normalize_asset_type(asset_type)
    stocks = _query_portfolio_stocks(
        db,
        normalized_params,
        group_name,
        normalized_asset_type,
    )
    if not stocks:
        return []

    stock_codes = [stock.stock_code for stock in stocks]
    # 计算类数据统一在这里批量构造，内部复用 analyzer 的进程级缓存。
    snapshots_by_code = build_stock_portfolio_snapshots(stocks)
    # 分组关系也批量读取，避免序列化阶段对每只股票重复查库。
    portfolio_group_names_by_code = get_stock_group_names_by_codes(
        db,
        stock_codes,
        PORTFOLIO_GROUP_PARAMS,
    )
    industry_group_names_by_code = get_stock_group_names_by_codes(
        db,
        stock_codes,
        INDUSTRY_GROUP_PARAMS,
    )

    return [
        serialize_portfolio_stock(
            db,
            stock,
            snapshots_by_code.get(stock.stock_code),
            normalized_params,
            portfolio_group_names_by_code.get(stock.stock_code),
            industry_group_names_by_code.get(stock.stock_code),
        )
        for stock in stocks
    ]

