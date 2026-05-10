"""Portfolio request and domain value normalizers."""

from .constants import (
    ASSET_TYPE_STOCK,
    DEFAULT_GROUP_PARAMS,
    MEMBERSHIP_SCOPE_SELF_SELECTED,
    VALID_ASSET_TYPES,
    VALID_GROUP_PARAMS,
    VALID_MEMBERSHIP_SCOPES,
)
from .exceptions import PortfolioValidationError


def normalize_group_params(params: int | None) -> int:
    """校验并归一化分组类型，1 表示自选分组，2 表示行业分组。"""
    try:
        normalized_params = DEFAULT_GROUP_PARAMS if params is None else int(params)
    except (TypeError, ValueError) as exc:
        raise PortfolioValidationError("Invalid group params") from exc

    if normalized_params not in VALID_GROUP_PARAMS:
        raise PortfolioValidationError("Invalid group params")
    return normalized_params


def normalize_membership_scope(scope: str | None) -> str:
    """校验股票入池范围，决定写入自选、组合分组还是行业分组。"""
    normalized_scope = str(scope or MEMBERSHIP_SCOPE_SELF_SELECTED).strip()
    if normalized_scope not in VALID_MEMBERSHIP_SCOPES:
        raise PortfolioValidationError("Invalid membership scope")
    return normalized_scope


def normalize_asset_type(asset_type: str | None = None) -> str:
    """校验列表筛选的资产类型参数。"""
    normalized_asset_type = str(asset_type or ASSET_TYPE_STOCK).strip().lower()
    if normalized_asset_type not in VALID_ASSET_TYPES:
        raise PortfolioValidationError("Invalid asset type")
    return normalized_asset_type

