"""策略 API 的请求模型。"""

from typing import Any

from pydantic import BaseModel


class StrategyCreateRequest(BaseModel):
    category: str
    name: str
    conditions: list[str]
    action: str
    rule: dict[str, Any] | None = None
