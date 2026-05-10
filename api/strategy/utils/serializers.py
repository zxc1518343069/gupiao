"""策略数据库模型序列化。"""

import json

from database import StrategyConfig

from .parsers import normalize_action_display
from .rules import parse_strategy_rule


def serialize_strategy(strategy: StrategyConfig) -> dict:
    """把策略模型转换为前端使用的数据结构。"""
    try:
        conditions = json.loads(strategy.conditions_json)
    except json.JSONDecodeError:
        conditions = []

    if not isinstance(conditions, list):
        conditions = []

    normalized_conditions = [str(condition) for condition in conditions]

    return {
        "id": str(strategy.id),
        "category": strategy.category,
        "name": strategy.name,
        "conditions": normalized_conditions,
        "action": normalize_action_display(strategy.action),
        "rule": parse_strategy_rule(strategy, normalized_conditions),
        "created_at": strategy.created_at,
    }
