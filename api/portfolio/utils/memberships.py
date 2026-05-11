"""分组归属与持仓成员关系工具。"""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from database import SelfSelectedStock, StockGroup, StockGroupMembership
from services.portfolio.constants import (
    ASSET_TYPE_ETF,
    DEFAULT_GROUP_NAME,
    DEFAULT_GROUP_PARAMS,
    INDUSTRY_GROUP_PARAMS,
    MAX_INDUSTRY_GROUP_ETF_COUNT,
    PORTFOLIO_GROUP_PARAMS,
)
from services.portfolio.exceptions import PortfolioValidationError
from services.portfolio.groups import (
    get_stock_group_names as _get_stock_group_names,
    get_stock_group_names_by_codes as _get_stock_group_names_by_codes,
)
from services.portfolio.normalizers import (
    normalize_asset_type as _normalize_asset_type,
    normalize_group_params as _normalize_group_params,
    normalize_membership_scope as _normalize_membership_scope,
)


def normalize_group_params(params: int | None) -> int:
    """校验并归一化分组类型，1 表示自选分组，2 表示行业分组。"""
    try:
        return _normalize_group_params(params)
    except PortfolioValidationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


def normalize_membership_scope(scope: str | None) -> str:
    """校验股票入池范围，决定写入自选、组合分组还是行业分组。"""
    try:
        return _normalize_membership_scope(scope)
    except PortfolioValidationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


def normalize_asset_type(asset_type: str | None = None) -> str:
    """校验列表筛选的资产类型参数。"""
    try:
        return _normalize_asset_type(asset_type)
    except PortfolioValidationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


def get_stock_group_names(db: Session, stock_code: str, params: int) -> list[str]:
    """查询单只股票在指定分组类型下所属的全部分组名。"""
    try:
        return _get_stock_group_names(db, stock_code, params)
    except PortfolioValidationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


def get_stock_group_names_by_codes(
    db: Session,
    stock_codes: list[str],
    params: int,
) -> dict[str, list[str]]:
    """批量读取股票分组名，避免列表接口对每只股票重复查询 membership。"""
    try:
        return _get_stock_group_names_by_codes(db, stock_codes, params)
    except PortfolioValidationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


def upsert_group_membership(db: Session, stock_code: str, group_name: str, params: int) -> bool:
    """确保股票属于某个分组，已存在返回 False，新建返回 True。"""
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
    """删除单条股票-分组关系，返回是否真的删除了记录。"""
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
    """判断股票是否已经属于指定分组。"""
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
    """统计某个行业分组下已经关联的 ETF 数量。"""
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
    """限制每个行业分组中 ETF 数量，避免行业概览被 ETF 过度占满。"""
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
    """判断股票是否属于任一自选分组。"""
    return bool(get_stock_group_names(db, stock.stock_code, PORTFOLIO_GROUP_PARAMS))


def has_industry_group_membership(db: Session, stock: SelfSelectedStock) -> bool:
    """判断股票是否属于任一行业分组。"""
    return bool(get_stock_group_names(db, stock.stock_code, INDUSTRY_GROUP_PARAMS))


def has_any_membership(db: Session, stock: SelfSelectedStock) -> bool:
    """判断股票是否仍有任何保留理由，用于移除后的孤儿清理。"""
    return bool(
        stock.is_self_selected
        or has_portfolio_group_membership(db, stock)
        or has_industry_group_membership(db, stock)
    )


def cleanup_stock_if_orphaned(db: Session, stock: SelfSelectedStock) -> None:
    """删除已经不在任何自选/分组范围内的股票记录。"""
    if not has_any_membership(db, stock):
        db.delete(stock)


def ensure_group_exists(db: Session, group_name: str, params: int = DEFAULT_GROUP_PARAMS) -> None:
    """确保目标分组存在；不存在时自动创建，跨类别重名则拒绝。"""
    if group_name == DEFAULT_GROUP_NAME:
        return

    normalized_params = normalize_group_params(params)
    group = db.query(StockGroup).filter(StockGroup.name == group_name).first()
    if group is not None and group.params != normalized_params:
        raise HTTPException(status_code=400, detail="Group name already exists in another category")

    if group is None:
        db.add(StockGroup(name=group_name, params=normalized_params))
        db.flush()

