"""Portfolio group membership queries."""

from sqlalchemy.orm import Session

from database import StockGroupMembership

from .constants import DEFAULT_GROUP_NAME
from .normalizers import normalize_group_params


def sort_group_names(group_names: list[str]) -> list[str]:
    """统一分组名展示顺序，默认分组始终排在最前。"""
    return sorted(group_names, key=lambda name: (name != DEFAULT_GROUP_NAME, name))


def get_stock_group_names(db: Session, stock_code: str, params: int) -> list[str]:
    """查询单只股票在指定分组类型下所属的全部分组名。"""
    normalized_params = normalize_group_params(params)
    group_names = [
        row[0]
        for row in db.query(StockGroupMembership.group_name)
        .filter(
            StockGroupMembership.stock_code == stock_code,
            StockGroupMembership.params == normalized_params,
        )
        .all()
    ]
    return sort_group_names(group_names)


def get_stock_group_names_by_codes(
    db: Session,
    stock_codes: list[str],
    params: int,
) -> dict[str, list[str]]:
    """批量读取股票分组名，避免列表接口对每只股票重复查询 membership。"""
    normalized_params = normalize_group_params(params)
    if not stock_codes:
        return {}

    group_names_by_code: dict[str, list[str]] = {stock_code: [] for stock_code in stock_codes}
    rows = (
        db.query(StockGroupMembership.stock_code, StockGroupMembership.group_name)
        .filter(
            StockGroupMembership.stock_code.in_(stock_codes),
            StockGroupMembership.params == normalized_params,
        )
        .all()
    )

    for stock_code, group_name in rows:
        group_names_by_code.setdefault(stock_code, []).append(group_name)

    return {
        stock_code: sort_group_names(group_names)
        for stock_code, group_names in group_names_by_code.items()
    }

