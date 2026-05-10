"""股票与 ETF 列表接口。"""

from fastapi import APIRouter

from ..utils.lists import build_etf_list, build_stock_list

router = APIRouter()


@router.get("/list")
def get_stock_list():
    """获取所有有效股票列表，过滤非股票、ST 和退市标的。"""
    return {"data": build_stock_list()}


@router.get("/etf/list")
def get_etf_list():
    """获取所有可用 ETF 列表。"""
    return {"data": build_etf_list()}
