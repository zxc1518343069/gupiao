"""股票日线数据接口。"""

from fastapi import APIRouter, HTTPException

from services.stock_metadata import get_stock_name

from ..utils.day_reader import read_tdx_day_records

router = APIRouter()


@router.get("/{stock_code}")
def get_stock_data(stock_code: str, limit: int = 100):
    """直接读取通达信 vipdoc 日线文件并返回最近 N 条数据。"""
    try:
        data = read_tdx_day_records(stock_code, limit)
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error

    return {
        "code": stock_code,
        "name": get_stock_name(stock_code),
        "data": data,
    }
