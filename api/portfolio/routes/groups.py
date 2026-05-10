"""组合分组相关接口。"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import (
    PortfolioAnalysisDetail,
    PortfolioAnalysisRun,
    SelfSelectedStock,
    StockGroup,
    StockGroupMembership,
)

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
    normalized_params = normalize_group_params(params)
    groups = db.query(StockGroup.name).filter(StockGroup.params == normalized_params).all()
    return {"data": [group[0] for group in groups]}


@router.get("/groups/detail")
def get_group_details(params: int = DEFAULT_GROUP_PARAMS, db: Session = Depends(get_db)):
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

    for stock in db.query(SelfSelectedStock).filter(SelfSelectedStock.stock_code.in_(affected_stock_codes)).all():
        sync_stock_membership_fields(db, stock)

    # 历史分析记录只关联组合分组，因此只在该类别下同步名称。
    if normalized_params == PORTFOLIO_GROUP_PARAMS:
        for run in db.query(PortfolioAnalysisRun).filter(PortfolioAnalysisRun.group_name == old_name).all():
            run.group_name = new_name

        details = (
            db.query(PortfolioAnalysisDetail).filter(PortfolioAnalysisDetail.group_name == old_name).all()
        )
        for detail in details:
            detail.group_name = new_name

    db.commit()
    return {"message": "Group renamed successfully"}


@router.delete("/groups/remove/{group_name}")
def remove_group(group_name: str, params: int = DEFAULT_GROUP_PARAMS, db: Session = Depends(get_db)):
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

    for stock in db.query(SelfSelectedStock).filter(SelfSelectedStock.stock_code.in_(affected_stock_codes)).all():
        cleanup_stock_if_orphaned(db, stock)

    if normalized_params == PORTFOLIO_GROUP_PARAMS:
        # 组合分组被删除后，其历史分析记录也一并清理，避免出现孤儿运行记录。
        run_ids = [
            run.id
            for run in db.query(PortfolioAnalysisRun.id)
            .filter(PortfolioAnalysisRun.group_name == group_name)
            .all()
        ]
        if run_ids:
            db.query(PortfolioAnalysisDetail).filter(PortfolioAnalysisDetail.run_id.in_(run_ids)).delete(
                synchronize_session=False
            )
        db.query(PortfolioAnalysisRun).filter(PortfolioAnalysisRun.group_name == group_name).delete(
            synchronize_session=False
        )

    db.delete(group)
    db.commit()
    return {"message": "Group deleted successfully"}
