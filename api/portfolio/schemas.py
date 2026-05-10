"""组合持仓模块请求模型。"""

from pydantic import BaseModel

from .constants import (
    DEFAULT_GROUP_NAME,
    DEFAULT_GROUP_PARAMS,
    MEMBERSHIP_SCOPE_SELF_SELECTED,
)


class StockAddRequest(BaseModel):
    stock_code: str
    stock_name: str
    group_name: str = DEFAULT_GROUP_NAME
    params: int = DEFAULT_GROUP_PARAMS
    scope: str = MEMBERSHIP_SCOPE_SELF_SELECTED
    notes: str | None = None


class StockBatchAddItem(BaseModel):
    stock_code: str
    stock_name: str


class StockBatchAddRequest(BaseModel):
    stocks: list[StockBatchAddItem]
    group_name: str = DEFAULT_GROUP_NAME
    params: int = DEFAULT_GROUP_PARAMS
    scope: str = MEMBERSHIP_SCOPE_SELF_SELECTED
    notes: str | None = None


class GroupAddRequest(BaseModel):
    name: str
    params: int = DEFAULT_GROUP_PARAMS


class GroupRenameRequest(BaseModel):
    old_name: str
    new_name: str
    params: int = DEFAULT_GROUP_PARAMS


class StockTagsUpdateRequest(BaseModel):
    tags: list[str]


class TagDefinitionRequest(BaseModel):
    name: str
    color: str
