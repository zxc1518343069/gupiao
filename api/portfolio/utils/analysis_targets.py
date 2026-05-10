"""组合分析目标分组归并逻辑。"""

from collections import defaultdict

from sqlalchemy.orm import Session

from database import SelfSelectedStock, StockGroupMembership

from ..constants import DEFAULT_GROUP_NAME, PORTFOLIO_GROUP_PARAMS
from .memberships import sort_group_names


def resolve_target_groups(
    db: Session,
    group_name: str | None = None,
) -> dict[str, list[SelfSelectedStock]]:
    """按组合分组归并待分析股票，保留“默认分组”这一逻辑视图。"""
    grouped_stocks: dict[str, list[SelfSelectedStock]] = defaultdict(list)

    if group_name:
        if group_name == DEFAULT_GROUP_NAME:
            stocks = (
                db.query(SelfSelectedStock)
                .filter(
                    SelfSelectedStock.is_self_selected.is_(True),
                    ~SelfSelectedStock.stock_code.in_(
                        db.query(StockGroupMembership.stock_code).filter(
                            StockGroupMembership.params == PORTFOLIO_GROUP_PARAMS
                        )
                    ),
                )
                .order_by(SelfSelectedStock.stock_code.asc())
                .all()
            )
            grouped_stocks[group_name] = stocks
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
            stocks = (
                db.query(SelfSelectedStock)
                .filter(SelfSelectedStock.stock_code.in_(stock_codes))
                .order_by(SelfSelectedStock.stock_code.asc())
                .all()
            )
            grouped_stocks[group_name] = stocks
    else:
        memberships = (
            db.query(StockGroupMembership.stock_code, StockGroupMembership.group_name)
            .filter(StockGroupMembership.params == PORTFOLIO_GROUP_PARAMS)
            .all()
        )
        grouped_codes: dict[str, list[str]] = defaultdict(list)
        grouped_code_set: set[str] = set()

        for stock_code, membership_group_name in memberships:
            grouped_codes[membership_group_name].append(stock_code)
            grouped_code_set.add(stock_code)

        for membership_group_name, stock_codes in grouped_codes.items():
            stocks = (
                db.query(SelfSelectedStock)
                .filter(SelfSelectedStock.stock_code.in_(stock_codes))
                .order_by(SelfSelectedStock.stock_code.asc())
                .all()
            )
            grouped_stocks[membership_group_name] = stocks

        default_group_stocks = (
            db.query(SelfSelectedStock)
            .filter(
                SelfSelectedStock.is_self_selected.is_(True),
                ~SelfSelectedStock.stock_code.in_(grouped_code_set) if grouped_code_set else True,
            )
            .order_by(SelfSelectedStock.stock_code.asc())
            .all()
        )
        if default_group_stocks:
            grouped_stocks[DEFAULT_GROUP_NAME] = default_group_stocks

    if group_name is not None and group_name not in grouped_stocks:
        grouped_stocks[group_name] = []

    return {name: grouped_stocks[name] for name in sort_group_names(list(grouped_stocks.keys()))}
