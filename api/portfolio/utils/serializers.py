"""面向接口返回的序列化工具。"""

from sqlalchemy.orm import Session

from database import SelfSelectedStock
from services.stock_metadata import get_stock_name, get_stock_profile, infer_asset_type

from ..constants import (
    DEFAULT_GROUP_NAME,
    DEFAULT_GROUP_PARAMS,
    INDUSTRY_GROUP_PARAMS,
    PORTFOLIO_GROUP_PARAMS,
)
from .memberships import get_stock_group_names, normalize_group_params
from .tags import get_stock_tags


def serialize_portfolio_stock(
    db: Session,
    stock: SelfSelectedStock,
    analysis_snapshot: dict | None = None,
    params: int = DEFAULT_GROUP_PARAMS,
    portfolio_group_names: list[str] | None = None,
    industry_group_names: list[str] | None = None,
) -> dict:
    """统一持仓返回结构，兼容前端现有字段命名。"""
    metadata = get_stock_profile(stock.stock_code)
    display_stock_name = get_stock_name(stock.stock_code, stock.stock_name)
    normalized_params = normalize_group_params(params)
    # 列表接口会批量预取分组名；单条新增/更新接口没传时再按股票单独查询。
    portfolio_group_names = (
        portfolio_group_names
        if portfolio_group_names is not None
        else get_stock_group_names(db, stock.stock_code, PORTFOLIO_GROUP_PARAMS)
    )
    industry_group_names = (
        industry_group_names
        if industry_group_names is not None
        else get_stock_group_names(db, stock.stock_code, INDUSTRY_GROUP_PARAMS)
    )
    display_group_names = (
        industry_group_names
        if normalized_params == INDUSTRY_GROUP_PARAMS
        else portfolio_group_names
    )
    if normalized_params == PORTFOLIO_GROUP_PARAMS and stock.is_self_selected and not display_group_names:
        display_group_names = [DEFAULT_GROUP_NAME]

    display_group_name = display_group_names[0] if display_group_names else ""
    snapshot = analysis_snapshot or {}

    return {
        "stock_code": stock.stock_code,
        "stock_name": display_stock_name,
        "asset_type": stock.asset_type or infer_asset_type(stock.stock_code),
        "group_name": display_group_name,
        "group_names": display_group_names,
        "portfolio_group_name": portfolio_group_names[0] if portfolio_group_names else None,
        "portfolio_group_names": portfolio_group_names,
        "industry_group_name": industry_group_names[0] if industry_group_names else None,
        "industry_group_names": industry_group_names,
        "is_self_selected": stock.is_self_selected,
        "notes": stock.notes,
        "tags": get_stock_tags(stock.notes),
        "added_at": stock.added_at,
        "company_intro": metadata.get("company_intro"),
        "industry_name": metadata.get("industry_name"),
        "industry_detail": metadata.get("industry_detail"),
        "industry_display": metadata.get("industry_display"),
        "close": snapshot.get("close"),
        "added_price": snapshot.get("added_price"),
        "added_price_date": snapshot.get("added_price_date"),
        "latest_price": snapshot.get("latest_price"),
        "latest_price_date": snapshot.get("latest_price_date"),
        "daily_change_pct": snapshot.get("daily_change_pct"),
        "portfolio_return": snapshot.get("portfolio_return"),
        "vol_ratio": snapshot.get("vol_ratio"),
        "volume_meta": snapshot.get("volume_meta"),
        "ma_metrics": snapshot.get("ma_metrics"),
        "bias_str": snapshot.get("bias_str"),
        "slope_str": snapshot.get("slope_str"),
        "vol_status": snapshot.get("vol_status"),
        "trend_str": snapshot.get("trend_str"),
        "analysis_error": snapshot.get("error"),
    }
