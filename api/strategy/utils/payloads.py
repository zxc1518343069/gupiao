"""策略请求参数归一化。"""

from fastapi import HTTPException

from ..schemas import StrategyCreateRequest
from .parsers import normalize_action_display


def normalize_strategy_payload(request: StrategyCreateRequest) -> tuple[str, str, list[str], str]:
    """清洗策略基础字段，并集中处理空值校验。"""
    # 这里统一裁剪字符串，保证 routes 只处理已经标准化后的 payload。
    category = request.category.strip()
    name = request.name.strip()
    action = normalize_action_display(request.action.strip())
    conditions = [str(condition).strip() for condition in request.conditions if str(condition).strip()]

    if not category:
        raise HTTPException(status_code=400, detail="策略类型不能为空")
    if not name:
        raise HTTPException(status_code=400, detail="策略名称不能为空")
    if not conditions:
        raise HTTPException(status_code=400, detail="策略条件不能为空")
    if not action:
        raise HTTPException(status_code=400, detail="策略操作不能为空")

    return category, name, conditions, action
