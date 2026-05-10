"""策略触发信号接口。"""

from fastapi import APIRouter

router = APIRouter(prefix="/api/strategy", tags=["strategy"])


@router.get("/signals")
def get_strategy_signals():
    """获取策略触发信号列表，后续可替换为真实信号表查询。"""
    return {"data": []}
