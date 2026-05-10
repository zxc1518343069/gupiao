"""组合持仓增删改查接口。"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import SelfSelectedStock, StockGroupMembership
from services.analyzer import get_stock_portfolio_snapshot

from ...dependencies import get_db
from ..constants import (
    ASSET_TYPE_ALL,
    ASSET_TYPE_STOCK,
    DEFAULT_GROUP_NAME,
    DEFAULT_GROUP_PARAMS,
    INDUSTRY_GROUP_PARAMS,
    PORTFOLIO_GROUP_PARAMS,
)
from ..schemas import (
    StockAddRequest,
    StockBatchAddRequest,
    StockTagsUpdateRequest,
)
from ..utils.memberships import (
    cleanup_stock_if_orphaned,
    delete_group_membership,
    normalize_asset_type,
    normalize_group_params,
    normalize_membership_scope,
)
from ..utils.serializers import serialize_portfolio_stock
from ..utils.stocks import add_stock_record
from ..utils.tags import serialize_stock_notes

router = APIRouter(tags=["portfolio"])


@router.get("/list")
def get_portfolio(
    params: int = DEFAULT_GROUP_PARAMS,
    group_name: str | None = None,
    asset_type: str = ASSET_TYPE_STOCK,
    db: Session = Depends(get_db),
):
    normalized_params = normalize_group_params(params)
    normalized_asset_type = normalize_asset_type(asset_type)
    query = db.query(SelfSelectedStock).order_by(SelfSelectedStock.added_at.desc())

    if normalized_asset_type != ASSET_TYPE_ALL:
        query = query.filter(SelfSelectedStock.asset_type == normalized_asset_type)

    if normalized_params == INDUSTRY_GROUP_PARAMS:
        if group_name:
            stock_codes = [
                row[0]
                for row in db.query(StockGroupMembership.stock_code)
                .filter(
                    StockGroupMembership.params == INDUSTRY_GROUP_PARAMS,
                    StockGroupMembership.group_name == group_name,
                )
                .all()
            ]
            if not stock_codes:
                return {"data": []}
            query = query.filter(SelfSelectedStock.stock_code.in_(stock_codes))
        else:
            stock_codes = [
                row[0]
                for row in db.query(StockGroupMembership.stock_code)
                .filter(StockGroupMembership.params == INDUSTRY_GROUP_PARAMS)
                .all()
            ]
            if not stock_codes:
                return {"data": []}
            query = query.filter(SelfSelectedStock.stock_code.in_(stock_codes))
    elif group_name:
        if group_name == DEFAULT_GROUP_NAME:
            query = query.filter(SelfSelectedStock.is_self_selected.is_(True))
        else:
            stock_codes = [
                row[0]
                for row in db.query(StockGroupMembership.stock_code)
                .filter(
                    StockGroupMembership.params == PORTFOLIO_GROUP_PARAMS,
                    StockGroupMembership.group_name == group_name,
                )
                .all()
            ]
            if not stock_codes:
                return {"data": []}
            query = query.filter(SelfSelectedStock.stock_code.in_(stock_codes))
    else:
        query = query.filter(SelfSelectedStock.is_self_selected.is_(True))

    serialized_stocks: list[dict] = []
    for stock in query.all():
        # 列表接口顺带拼接一次分析快照，前端可以直接展示收益和趋势字段。
        snapshot = get_stock_portfolio_snapshot(stock.stock_code, stock.added_at)
        serialized_stocks.append(serialize_portfolio_stock(db, stock, snapshot, normalized_params))

    return {"data": serialized_stocks}


@router.post("/add")
def add_to_portfolio(request: StockAddRequest, db: Session = Depends(get_db)):
    success, message, stock = add_stock_record(
        db,
        stock_code=request.stock_code,
        stock_name=request.stock_name,
        group_name=request.group_name,
        params=request.params,
        scope=request.scope,
        notes=request.notes,
    )

    if not success:
        raise HTTPException(status_code=400, detail=message)

    db.commit()
    return {"message": message, "data": serialize_portfolio_stock(db, stock, params=request.params)}


@router.post("/add/batch")
def add_batch_to_portfolio(request: StockBatchAddRequest, db: Session = Depends(get_db)):
    if not request.stocks:
        raise HTTPException(status_code=400, detail="No stocks provided")

    normalize_group_params(request.params)
    normalize_membership_scope(request.scope)

    added: list[dict] = []
    skipped: list[dict] = []
    seen_codes: set[str] = set()

    for item in request.stocks:
        if item.stock_code in seen_codes:
            skipped.append(
                {
                    "stock_code": item.stock_code,
                    "stock_name": item.stock_name,
                    "reason": "Duplicated in request",
                }
            )
            continue

        seen_codes.add(item.stock_code)
        success, _, stock = add_stock_record(
            db,
            stock_code=item.stock_code,
            stock_name=item.stock_name,
            group_name=request.group_name,
            params=request.params,
            scope=request.scope,
            notes=request.notes,
        )

        if success and stock is not None:
            added.append(serialize_portfolio_stock(db, stock, params=request.params))
        else:
            skipped.append(
                {
                    "stock_code": item.stock_code,
                    "stock_name": item.stock_name,
                    "reason": "Stock already in target scope",
                }
            )

    db.commit()

    return {
        "message": "Batch add completed",
        "data": {
            "added": added,
            "skipped": skipped,
            "added_count": len(added),
            "skipped_count": len(skipped),
        },
    }


@router.delete("/remove/{stock_code}")
def remove_from_portfolio(
    stock_code: str,
    params: int = DEFAULT_GROUP_PARAMS,
    group_name: str | None = None,
    db: Session = Depends(get_db),
):
    normalized_params = normalize_group_params(params)
    stock = db.query(SelfSelectedStock).filter(SelfSelectedStock.stock_code == stock_code).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found in portfolio")

    if normalized_params == INDUSTRY_GROUP_PARAMS:
        if not group_name:
            raise HTTPException(status_code=400, detail="Industry group name is required")

        if not delete_group_membership(db, stock.stock_code, group_name, INDUSTRY_GROUP_PARAMS):
            raise HTTPException(status_code=404, detail="Stock not found in industry group")
    else:
        if group_name:
            if group_name == DEFAULT_GROUP_NAME:
                stock.is_self_selected = False
            elif not delete_group_membership(db, stock.stock_code, group_name, PORTFOLIO_GROUP_PARAMS):
                raise HTTPException(status_code=404, detail="Stock not found in portfolio group")
        else:
            stock.is_self_selected = False

    cleanup_stock_if_orphaned(db, stock)
    db.commit()
    return {"message": "Removed successfully"}


@router.put("/tags/{stock_code}")
def update_portfolio_stock_tags(
    stock_code: str,
    request: StockTagsUpdateRequest,
    params: int = DEFAULT_GROUP_PARAMS,
    db: Session = Depends(get_db),
):
    stock = db.query(SelfSelectedStock).filter(SelfSelectedStock.stock_code == stock_code).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found in portfolio")

    stock.notes = serialize_stock_notes(stock.notes, request.tags)
    db.commit()
    db.refresh(stock)

    snapshot = get_stock_portfolio_snapshot(stock.stock_code, stock.added_at)
    return {
        "message": "Tags updated successfully",
        "data": serialize_portfolio_stock(db, stock, snapshot, params),
    }
