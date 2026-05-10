"""组合分析相关接口。"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import PortfolioAnalysisDetail, PortfolioAnalysisRun

from ...dependencies import get_db
from ..schemas import PortfolioAnalyzeRequest
from ..utils.analysis import create_analysis_run, get_latest_analysis_runs
from ..utils.analysis_targets import resolve_target_groups
from ..utils.serializers import serialize_detail, serialize_run

router = APIRouter(tags=["portfolio"])


@router.post("/analyze")
def analyze_portfolio(request: PortfolioAnalyzeRequest, db: Session = Depends(get_db)):
    grouped_stocks = resolve_target_groups(db, request.group_name)
    valid_groups = {group_name: stocks for group_name, stocks in grouped_stocks.items() if stocks}

    if not valid_groups:
        if request.group_name:
            raise HTTPException(status_code=400, detail="当前分组没有可分析的股票")
        raise HTTPException(status_code=400, detail="当前没有可分析的自选股票")

    run_summaries: list[dict] = []
    total_count = 0
    matched_count = 0
    unmatched_count = 0
    error_count = 0

    for group_name, stocks in valid_groups.items():
        summary = create_analysis_run(db, group_name, stocks)
        run_summaries.append(summary)
        total_count += summary["total_count"]
        matched_count += summary["matched_count"]
        unmatched_count += summary["unmatched_count"]
        error_count += summary["error_count"]

    db.commit()

    return {
        "data": run_summaries,
        "summary": {
            "groups_analyzed": len(run_summaries),
            "total_count": total_count,
            "matched_count": matched_count,
            "unmatched_count": unmatched_count,
            "error_count": error_count,
        },
    }


@router.get("/analysis/runs")
def get_analysis_runs(group_name: str | None = None, db: Session = Depends(get_db)):
    return {"data": get_latest_analysis_runs(db, group_name)}


@router.get("/analysis/runs/{run_id}")
def get_analysis_run_detail(run_id: int, db: Session = Depends(get_db)):
    run = db.query(PortfolioAnalysisRun).filter(PortfolioAnalysisRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Analysis run not found")

    details = db.query(PortfolioAnalysisDetail).filter(PortfolioAnalysisDetail.run_id == run_id).all()

    matched_items: list[dict] = []
    unmatched_items: list[dict] = []
    error_items: list[dict] = []

    for detail in details:
        serialized_detail = serialize_detail(detail)
        if detail.status == "matched":
            matched_items.append(serialized_detail)
        elif detail.status == "error":
            error_items.append(serialized_detail)
        else:
            unmatched_items.append(serialized_detail)

    matched_items.sort(key=lambda item: item.get("vol_ratio") or 0, reverse=True)
    unmatched_items.sort(key=lambda item: item["stock_code"])
    error_items.sort(key=lambda item: item["stock_code"])

    return {
        "summary": {
            **serialize_run(run),
            "matched_stock_codes": [item["stock_code"] for item in matched_items],
            "unmatched_stock_codes": [item["stock_code"] for item in unmatched_items],
            "error_stock_codes": [item["stock_code"] for item in error_items],
        },
        "matched": matched_items,
        "unmatched": unmatched_items,
        "errors": error_items,
    }
