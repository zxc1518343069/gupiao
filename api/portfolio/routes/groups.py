"""组合分组相关接口。"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import SelfSelectedStock, StockGroup, StockGroupMembership

from ...dependencies import get_db
from ..constants import (
    DEFAULT_GROUP_NAME,
    DEFAULT_GROUP_PARAMS,
    INDUSTRY_GROUP_PARAMS,
    PORTFOLIO_GROUP_PARAMS,
)
from ..schemas import GroupAddRequest, GroupRenameRequest
from ..utils.memberships import (
    cleanup_stock_if_orphaned,
    normalize_group_params,
    sync_stock_membership_fields,
)

router = APIRouter(tags=["portfolio"])


@router.get("/groups")
def get_groups(params: int = DEFAULT_GROUP_PARAMS, db: Session = Depends(get_db)):
    """返回指定分组类型下的分组名称列表，用于前端下拉筛选。"""
    normalized_params = normalize_group_params(params)
    groups = db.query(StockGroup.name).filter(StockGroup.params == normalized_params).all()
    return {"data": [group[0] for group in groups]}


@router.get("/groups/detail")
def get_group_details(params: int = DEFAULT_GROUP_PARAMS, db: Session = Depends(get_db)):
    """返回分组详情列表，包含创建时间等管理页需要展示的元信息。"""
    normalized_params = normalize_group_params(params)
    groups = (
        db.query(StockGroup)
        .filter(StockGroup.params == normalized_params)
        .order_by(StockGroup.created_at.desc())
        .all()
    )
    return {
        "data": [
            {
                "name": group.name,
                "created_at": group.created_at,
                "is_default": False,
            }
            for group in groups
        ]
    }


@router.post("/groups/add")
def add_group(request: GroupAddRequest, db: Session = Depends(get_db)):
    """创建自选分组或行业分组，并保证分组名不会跨类别冲突。"""
    name = request.name.strip()
    normalized_params = normalize_group_params(request.params)
    if not name or name == DEFAULT_GROUP_NAME:
        raise HTTPException(status_code=400, detail="Invalid group name")

    existing = db.query(StockGroup).filter(StockGroup.name == name).first()
    if existing:
        if existing.params == normalized_params:
            raise HTTPException(status_code=400, detail="Group already exists")
        raise HTTPException(status_code=400, detail="Group name already exists in another category")

    db.add(StockGroup(name=name, params=normalized_params))
    db.commit()
    return {"message": "Group created successfully"}


@router.put("/groups/rename")
def rename_group(request: GroupRenameRequest, db: Session = Depends(get_db)):
    """重命名分组，同时同步该分组下所有 membership 的冗余显示字段。"""
    old_name = request.old_name.strip()
    new_name = request.new_name.strip()
    normalized_params = normalize_group_params(request.params)

    if normalized_params == PORTFOLIO_GROUP_PARAMS and old_name == DEFAULT_GROUP_NAME:
        raise HTTPException(status_code=400, detail="Cannot rename default group")

    if not old_name or not new_name or new_name == DEFAULT_GROUP_NAME:
        raise HTTPException(status_code=400, detail="Invalid group name")

    if old_name == new_name:
        return {"message": "Group name unchanged"}

    group = (
        db.query(StockGroup)
        .filter(StockGroup.name == old_name, StockGroup.params == normalized_params)
        .first()
    )
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    existing = db.query(StockGroup).filter(StockGroup.name == new_name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Group already exists")

    group.name = new_name

    # membership 以 group_name 作为关系键，重命名时需要先改关系表。
    memberships = (
        db.query(StockGroupMembership)
        .filter(
            StockGroupMembership.group_name == old_name,
            StockGroupMembership.params == normalized_params,
        )
        .all()
    )
    affected_stock_codes = {membership.stock_code for membership in memberships}
    for membership in memberships:
        membership.group_name = new_name

    # SelfSelectedStock 仍保留 group_name / industry_group_name 兼容字段，
    # 因此关系表变更后需要重新同步这两个冗余字段。
    for stock in db.query(SelfSelectedStock).filter(SelfSelectedStock.stock_code.in_(affected_stock_codes)).all():
        sync_stock_membership_fields(db, stock)

    db.commit()
    return {"message": "Group renamed successfully"}


@router.delete("/groups/remove/{group_name}")
def remove_group(group_name: str, params: int = DEFAULT_GROUP_PARAMS, db: Session = Depends(get_db)):
    """删除分组并移除相关 membership；没有任何归属的股票会被一并清理。"""
    normalized_params = normalize_group_params(params)

    if normalized_params == PORTFOLIO_GROUP_PARAMS and group_name == DEFAULT_GROUP_NAME:
        raise HTTPException(status_code=400, detail="Cannot delete default group")

    group = (
        db.query(StockGroup)
        .filter(StockGroup.name == group_name, StockGroup.params == normalized_params)
        .first()
    )
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    memberships = (
        db.query(StockGroupMembership)
        .filter(
            StockGroupMembership.group_name == group_name,
            StockGroupMembership.params == normalized_params,
        )
        .all()
    )
    affected_stock_codes = {membership.stock_code for membership in memberships}
    for membership in memberships:
        db.delete(membership)

    # 删除关系后重新判断股票是否还属于自选、组合分组或行业分组。
    for stock in db.query(SelfSelectedStock).filter(SelfSelectedStock.stock_code.in_(affected_stock_codes)).all():
        cleanup_stock_if_orphaned(db, stock)

    db.delete(group)
    db.commit()
    return {"message": "Group deleted successfully"}
