"""持仓写入相关工具。"""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from database import SelfSelectedStock
from services.stock_metadata import get_stock_name, infer_asset_type

from ..constants import (
    DEFAULT_GROUP_NAME,
    DEFAULT_GROUP_PARAMS,
    INDUSTRY_GROUP_PARAMS,
    MEMBERSHIP_SCOPE_INDUSTRY_GROUP,
    MEMBERSHIP_SCOPE_PORTFOLIO_GROUP,
    MEMBERSHIP_SCOPE_SELF_SELECTED,
)
from .memberships import (
    ensure_group_exists,
    ensure_industry_group_etf_capacity,
    normalize_group_params,
    normalize_membership_scope,
    sync_stock_membership_fields,
    upsert_group_membership,
)


def add_stock_record(
    db: Session,
    stock_code: str,
    stock_name: str,
    group_name: str,
    params: int = DEFAULT_GROUP_PARAMS,
    scope: str = MEMBERSHIP_SCOPE_SELF_SELECTED,
    notes: str | None = None,
) -> tuple[bool, str, SelfSelectedStock | None]:
    """统一处理单只股票入池逻辑，兼容不同归属范围。"""
    normalized_params = normalize_group_params(params)
    normalized_scope = normalize_membership_scope(scope)
    normalized_group_name = str(group_name or "").strip()
    resolved_stock_name = get_stock_name(stock_code, stock_name)
    inferred_asset_type = infer_asset_type(stock_code)

    # 自选范围允许默认分组；分组/行业范围必须明确传入非默认分组名。
    if normalized_scope == MEMBERSHIP_SCOPE_SELF_SELECTED:
        normalized_group_name = normalized_group_name or DEFAULT_GROUP_NAME
        if normalized_group_name != DEFAULT_GROUP_NAME:
            ensure_group_exists(db, normalized_group_name, DEFAULT_GROUP_PARAMS)
    else:
        if not normalized_group_name or normalized_group_name == DEFAULT_GROUP_NAME:
            raise HTTPException(status_code=400, detail="Invalid group name")
        ensure_group_exists(db, normalized_group_name, normalized_params)

    existing = db.query(SelfSelectedStock).filter(SelfSelectedStock.stock_code == stock_code).first()
    if existing:
        # 已存在时只补齐变化的基础字段和目标 membership，不重复创建股票记录。
        changed = False

        if resolved_stock_name and existing.stock_name != resolved_stock_name:
            existing.stock_name = resolved_stock_name
            changed = True

        if existing.asset_type != inferred_asset_type:
            existing.asset_type = inferred_asset_type
            changed = True

        if normalized_scope == MEMBERSHIP_SCOPE_SELF_SELECTED:
            # 加入默认自选只需要恢复 is_self_selected；加入自定义自选还要写关系表。
            if not existing.is_self_selected:
                existing.is_self_selected = True
                changed = True

            if normalized_group_name != DEFAULT_GROUP_NAME:
                changed = (
                    upsert_group_membership(
                        db,
                        existing.stock_code,
                        normalized_group_name,
                        DEFAULT_GROUP_PARAMS,
                    )
                    or changed
                )
        elif normalized_scope == MEMBERSHIP_SCOPE_PORTFOLIO_GROUP:
            # 组合分组不一定代表默认自选，因此只写自选分组关系。
            changed = (
                upsert_group_membership(
                    db,
                    existing.stock_code,
                    normalized_group_name,
                    DEFAULT_GROUP_PARAMS,
                )
                or changed
            )
        else:
            # 行业分组对 ETF 有容量限制，校验通过后写行业关系。
            ensure_industry_group_etf_capacity(
                db,
                existing.stock_code,
                normalized_group_name,
                inferred_asset_type,
            )
            changed = (
                upsert_group_membership(
                    db,
                    existing.stock_code,
                    normalized_group_name,
                    INDUSTRY_GROUP_PARAMS,
                )
                or changed
            )

        if changed:
            sync_stock_membership_fields(db, existing)
            db.flush()
            return True, "Added successfully", existing
        return False, "Stock already in target scope", None

    stock = SelfSelectedStock(
        stock_code=stock_code,
        stock_name=resolved_stock_name,
        asset_type=inferred_asset_type,
        group_name=DEFAULT_GROUP_NAME if normalized_scope == MEMBERSHIP_SCOPE_SELF_SELECTED else None,
        is_self_selected=normalized_scope == MEMBERSHIP_SCOPE_SELF_SELECTED,
        industry_group_name=None,
        notes=notes,
    )
    db.add(stock)
    db.flush()

    # 新股票先落主表拿到对象，再根据目标范围补 membership。
    if normalized_scope == MEMBERSHIP_SCOPE_SELF_SELECTED and normalized_group_name != DEFAULT_GROUP_NAME:
        upsert_group_membership(db, stock.stock_code, normalized_group_name, DEFAULT_GROUP_PARAMS)
    elif normalized_scope == MEMBERSHIP_SCOPE_PORTFOLIO_GROUP:
        upsert_group_membership(db, stock.stock_code, normalized_group_name, DEFAULT_GROUP_PARAMS)
    elif normalized_scope == MEMBERSHIP_SCOPE_INDUSTRY_GROUP:
        ensure_industry_group_etf_capacity(
            db,
            stock.stock_code,
            normalized_group_name,
            inferred_asset_type,
        )
        upsert_group_membership(db, stock.stock_code, normalized_group_name, INDUSTRY_GROUP_PARAMS)

    sync_stock_membership_fields(db, stock)
    return True, "Added successfully", stock
