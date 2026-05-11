"""组合持仓增删改查接口。"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import SelfSelectedStock
from services.portfolio.exceptions import PortfolioValidationError
from services.portfolio.snapshots import get_stock_portfolio_snapshot
from services.portfolio.stocks import list_portfolio_stocks

from ...dependencies import get_db
from ..constants import (
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
    """返回自选/行业股票列表，并附带当前行情快照和分组展示字段。"""
    try:
        data = list_portfolio_stocks(
            db,
            params=params,
            group_name=group_name,
            asset_type=asset_type,
        )
    except PortfolioValidationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    return {"data": data}


@router.post("/add")
def add_to_portfolio(request: StockAddRequest, db: Session = Depends(get_db)):
    """添加单只股票到自选、组合分组或行业分组。"""
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
    return {"message": message, "data": serialize_portfolio_stock(db, stock)}


@router.post("/add/batch")
def add_batch_to_portfolio(request: StockBatchAddRequest, db: Session = Depends(get_db)):
    """批量添加股票，逐条返回成功和跳过结果，便于前端展示导入反馈。"""
    if not request.stocks:
        raise HTTPException(status_code=400, detail="No stocks provided")

    normalize_group_params(request.params)
    normalize_membership_scope(request.scope)

    added: list[dict] = []
    skipped: list[dict] = []
    seen_codes: set[str] = set()

    for item in request.stocks:
        # 同一批请求内重复代码直接跳过，避免重复写库和重复提示。
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
            added.append(serialize_portfolio_stock(db, stock))
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
    """从指定归属范围移除股票，并清理已经没有任何归属的记录。"""
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
    """更新单只股票标签，并返回和列表接口一致的股票详情结构。"""
    stock = db.query(SelfSelectedStock).filter(SelfSelectedStock.stock_code == stock_code).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found in portfolio")

    stock.notes = serialize_stock_notes(stock.notes, request.tags)
    db.commit()
    db.refresh(stock)

    snapshot = get_stock_portfolio_snapshot(stock.stock_code, stock.added_at)
    return {
        "message": "Tags updated successfully",
        "data": serialize_portfolio_stock(db, stock, snapshot),
    }
