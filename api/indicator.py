from fastapi import APIRouter

router = APIRouter(prefix="/api/indicator", tags=["indicator"])

@router.get("/ma/{stock_code}")
def get_moving_average(stock_code: str, period: int = 5):
    """
    获取指定股票的均线数据 (Mock)
    """
    # 这里后续可以调用你的 Python 脚本或直接计算
    return {"message": f"MA{period} data for {stock_code} will be implemented here"}
