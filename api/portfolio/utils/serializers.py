"""API compatibility wrapper for portfolio serializers."""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from database import SelfSelectedStock
from services.portfolio.exceptions import PortfolioValidationError
from services.portfolio.serializers import serialize_portfolio_stock as _serialize_portfolio_stock


def serialize_portfolio_stock(
    db: Session,
    stock: SelfSelectedStock,
    analysis_snapshot: dict | None = None,
    portfolio_group_names: list[str] | None = None,
    industry_group_names: list[str] | None = None,
) -> dict:
    """兼容旧导入路径，把业务序列化交给 services.portfolio。"""
    try:
        return _serialize_portfolio_stock(
            db,
            stock,
            analysis_snapshot,
            portfolio_group_names,
            industry_group_names,
        )
    except PortfolioValidationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
