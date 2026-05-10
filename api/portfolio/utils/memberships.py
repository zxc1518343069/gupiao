"""分组归属与持仓成员关系工具。"""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from database import SelfSelectedStock, StockGroup, StockGroupMembership

from ..constants import (
    ASSET_TYPE_ETF,
    ASSET_TYPE_STOCK,
    DEFAULT_GROUP_NAME,
    DEFAULT_GROUP_PARAMS,
    INDUSTRY_GROUP_PARAMS,
    MAX_INDUSTRY_GROUP_ETF_COUNT,
    MEMBERSHIP_SCOPE_SELF_SELECTED,
    PORTFOLIO_GROUP_PARAMS,
    VALID_ASSET_TYPES,
    VALID_GROUP_PARAMS,
    VALID_MEMBERSHIP_SCOPES,
)


def normalize_group_params(params: int | None) -> int:
    try:
        normalized_params = DEFAULT_GROUP_PARAMS if params is None else int(params)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Invalid group params") from exc

    if normalized_params not in VALID_GROUP_PARAMS:
        raise HTTPException(status_code=400, detail="Invalid group params")
    return normalized_params


def normalize_membership_scope(scope: str | None) -> str:
    normalized_scope = str(scope or MEMBERSHIP_SCOPE_SELF_SELECTED).strip()
    if normalized_scope not in VALID_MEMBERSHIP_SCOPES:
        raise HTTPException(status_code=400, detail="Invalid membership scope")
    return normalized_scope


def normalize_asset_type(asset_type: str | None = None) -> str:
    normalized_asset_type = str(asset_type or ASSET_TYPE_STOCK).strip().lower()
    if normalized_asset_type not in VALID_ASSET_TYPES:
        raise HTTPException(status_code=400, detail="Invalid asset type")
    return normalized_asset_type


def sort_group_names(group_names: list[str]) -> list[str]:
    return sorted(group_names, key=lambda name: (name != DEFAULT_GROUP_NAME, name))


def get_stock_group_names(db: Session, stock_code: str, params: int) -> list[str]:
    normalized_params = normalize_group_params(params)
    group_names = [
        row[0]
        for row in db.query(StockGroupMembership.group_name)
        .filter(
            StockGroupMembership.stock_code == stock_code,
            StockGroupMembership.params == normalized_params,
        )
        .all()
    ]
    return sort_group_names(group_names)


def upsert_group_membership(db: Session, stock_code: str, group_name: str, params: int) -> bool:
    membership = (
        db.query(StockGroupMembership)
        .filter(
            StockGroupMembership.stock_code == stock_code,
            StockGroupMembership.group_name == group_name,
            StockGroupMembership.params == params,
        )
        .first()
    )
    if membership is not None:
        return False

    db.add(
        StockGroupMembership(
            stock_code=stock_code,
            group_name=group_name,
            params=params,
        )
    )
    db.flush()
    return True


def delete_group_membership(db: Session, stock_code: str, group_name: str, params: int) -> bool:
    membership = (
        db.query(StockGroupMembership)
        .filter(
            StockGroupMembership.stock_code == stock_code,
            StockGroupMembership.group_name == group_name,
            StockGroupMembership.params == params,
        )
        .first()
    )
    if membership is None:
        return False

    db.delete(membership)
    db.flush()
    return True


def has_group_membership(db: Session, stock_code: str, group_name: str, params: int) -> bool:
    return (
        db.query(StockGroupMembership)
        .filter(
            StockGroupMembership.stock_code == stock_code,
            StockGroupMembership.group_name == group_name,
            StockGroupMembership.params == params,
        )
        .first()
        is not None
    )


def count_industry_group_etf_memberships(db: Session, group_name: str) -> int:
    stock_codes = [
        row[0]
        for row in db.query(StockGroupMembership.stock_code)
        .filter(
            StockGroupMembership.group_name == group_name,
            StockGroupMembership.params == INDUSTRY_GROUP_PARAMS,
        )
        .all()
    ]
    if not stock_codes:
        return 0

    return (
        db.query(SelfSelectedStock)
        .filter(
            SelfSelectedStock.stock_code.in_(stock_codes),
            SelfSelectedStock.asset_type == ASSET_TYPE_ETF,
        )
        .count()
    )


def ensure_industry_group_etf_capacity(
    db: Session,
    stock_code: str,
    group_name: str,
    asset_type: str,
) -> None:
    if asset_type != ASSET_TYPE_ETF:
        return
    if has_group_membership(db, stock_code, group_name, INDUSTRY_GROUP_PARAMS):
        return
    if count_industry_group_etf_memberships(db, group_name) >= MAX_INDUSTRY_GROUP_ETF_COUNT:
        raise HTTPException(
            status_code=400,
            detail=f"当前行业最多添加 {MAX_INDUSTRY_GROUP_ETF_COUNT} 个 ETF",
        )


def has_portfolio_group_membership(db: Session, stock: SelfSelectedStock) -> bool:
    return bool(get_stock_group_names(db, stock.stock_code, PORTFOLIO_GROUP_PARAMS))


def has_industry_group_membership(db: Session, stock: SelfSelectedStock) -> bool:
    return bool(get_stock_group_names(db, stock.stock_code, INDUSTRY_GROUP_PARAMS))


def has_any_membership(db: Session, stock: SelfSelectedStock) -> bool:
    return bool(
        stock.is_self_selected
        or has_portfolio_group_membership(db, stock)
        or has_industry_group_membership(db, stock)
    )


def sync_stock_membership_fields(db: Session, stock: SelfSelectedStock) -> None:
    """同步 SelfSelectedStock 上的冗余分组字段，兼容现有查询逻辑。"""
    portfolio_group_names = get_stock_group_names(db, stock.stock_code, PORTFOLIO_GROUP_PARAMS)
    industry_group_names = get_stock_group_names(db, stock.stock_code, INDUSTRY_GROUP_PARAMS)

    stock.group_name = (
        portfolio_group_names[0]
        if portfolio_group_names
        else (DEFAULT_GROUP_NAME if stock.is_self_selected else None)
    )
    stock.industry_group_name = industry_group_names[0] if industry_group_names else None


def cleanup_stock_if_orphaned(db: Session, stock: SelfSelectedStock) -> None:
    sync_stock_membership_fields(db, stock)
    if not has_any_membership(db, stock):
        db.delete(stock)


def ensure_group_exists(db: Session, group_name: str, params: int = DEFAULT_GROUP_PARAMS) -> None:
    if group_name == DEFAULT_GROUP_NAME:
        return

    normalized_params = normalize_group_params(params)
    group = db.query(StockGroup).filter(StockGroup.name == group_name).first()
    if group is not None and group.params != normalized_params:
        raise HTTPException(status_code=400, detail="Group name already exists in another category")

    if group is None:
        db.add(StockGroup(name=group_name, params=normalized_params))
        db.flush()

