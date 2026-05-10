"""组合分析运行相关工具。"""

from sqlalchemy.orm import Session

from database import PortfolioAnalysisDetail, PortfolioAnalysisRun, SelfSelectedStock
from services.analyzer import analyze_stock
from services.stock_metadata import get_stock_name

from .serializers import serialize_run


def create_analysis_run(
    db: Session,
    group_name: str,
    stocks: list[SelfSelectedStock],
) -> dict:
    """为单个分组创建一次完整分析运行并产出摘要。"""
    run = PortfolioAnalysisRun(
        group_name=group_name,
        total_count=len(stocks),
    )
    db.add(run)
    db.flush()

    matched_stocks: list[dict] = []
    unmatched_stocks: list[dict] = []
    error_stocks: list[dict] = []

    for stock in stocks:
        analysis_result = analyze_stock(stock.stock_code)
        display_stock_name = get_stock_name(stock.stock_code, stock.stock_name)
        detail = PortfolioAnalysisDetail(
            run_id=run.id,
            group_name=group_name,
            stock_code=stock.stock_code,
            stock_name=display_stock_name,
        )

        detail.date = analysis_result.get("date")
        detail.close = analysis_result.get("close")
        detail.vol_ratio = analysis_result.get("vol_ratio")
        detail.bias_str = analysis_result.get("bias_str")
        detail.slope_str = analysis_result.get("slope_str")
        detail.vol_status = analysis_result.get("vol_status")
        detail.trend_str = analysis_result.get("trend_str")

        if "error" in analysis_result:
            detail.status = "error"
            detail.reason = analysis_result["error"]
            error_stocks.append(
                {
                    "stock_code": stock.stock_code,
                    "stock_name": display_stock_name,
                    "reason": detail.reason,
                }
            )
        elif analysis_result.get("is_triggered", False):
            detail.is_triggered = True
            detail.status = "matched"
            detail.reason = "符合策略条件"
            matched_stocks.append(
                {
                    "stock_code": stock.stock_code,
                    "stock_name": display_stock_name,
                }
            )
        else:
            detail.status = "unmatched"
            detail.reason = analysis_result.get("reason") or "未满足策略条件"
            unmatched_stocks.append(
                {
                    "stock_code": stock.stock_code,
                    "stock_name": display_stock_name,
                    "reason": detail.reason,
                }
            )

        db.add(detail)

    run.matched_count = len(matched_stocks)
    run.unmatched_count = len(unmatched_stocks)
    run.error_count = len(error_stocks)
    db.flush()

    summary = serialize_run(run)
    summary["matched_stocks"] = matched_stocks
    summary["unmatched_stocks"] = unmatched_stocks
    summary["error_stocks"] = error_stocks
    return summary


def get_latest_analysis_runs(
    db: Session,
    group_name: str | None = None,
) -> list[dict]:
    query = db.query(PortfolioAnalysisRun).order_by(
        PortfolioAnalysisRun.analyzed_at.desc(),
        PortfolioAnalysisRun.id.desc(),
    )
    if group_name:
        query = query.filter(PortfolioAnalysisRun.group_name == group_name)

    latest_runs: list[dict] = []
    seen_groups: set[str] = set()
    for run in query.all():
        if run.group_name in seen_groups:
            continue
        seen_groups.add(run.group_name)
        latest_runs.append(serialize_run(run))

    return latest_runs
