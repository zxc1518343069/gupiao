"""策略配置 CRUD 接口。"""

import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.dependencies import get_db
from database import StrategyConfig

from ..schemas import StrategyCreateRequest
from ..utils.payloads import normalize_strategy_payload
from ..utils.serializers import serialize_strategy

router = APIRouter(prefix="/api/strategy", tags=["strategy"])


@router.get("")
def get_strategy_configs(db: Session = Depends(get_db)):
    """按创建时间倒序返回策略配置列表。"""
    strategies = db.query(StrategyConfig).order_by(
        StrategyConfig.created_at.desc(),
        StrategyConfig.id.desc(),
    ).all()
    return {"data": [serialize_strategy(strategy) for strategy in strategies]}


@router.post("")
def create_strategy_config(request: StrategyCreateRequest, db: Session = Depends(get_db)):
    """创建策略配置，并保留原始条件与结构化规则。"""
    # conditions_json 保留前端展示文案；rule_json 保存结构化规则供后续计算使用。
    category, name, conditions, action = normalize_strategy_payload(request)

    strategy = StrategyConfig(
        category=category,
        name=name,
        conditions_json=json.dumps(conditions, ensure_ascii=False),
        rule_json=json.dumps(request.rule, ensure_ascii=False) if request.rule else None,
        action=action,
    )
    db.add(strategy)
    db.commit()
    db.refresh(strategy)

    return {
        "message": "Strategy created successfully",
        "data": serialize_strategy(strategy),
    }


@router.put("/{strategy_id}")
def update_strategy_config(
    strategy_id: int,
    request: StrategyCreateRequest,
    db: Session = Depends(get_db),
):
    """更新策略配置，找不到时保持原有 404 行为。"""
    strategy = db.query(StrategyConfig).filter(StrategyConfig.id == strategy_id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")

    category, name, conditions, action = normalize_strategy_payload(request)

    # 更新时整体替换展示条件和结构化规则，避免前后端规则状态分叉。
    strategy.category = category
    strategy.name = name
    strategy.conditions_json = json.dumps(conditions, ensure_ascii=False)
    strategy.rule_json = json.dumps(request.rule, ensure_ascii=False) if request.rule else None
    strategy.action = action

    db.commit()
    db.refresh(strategy)

    return {
        "message": "Strategy updated successfully",
        "data": serialize_strategy(strategy),
    }


@router.delete("/{strategy_id}")
def delete_strategy_config(strategy_id: int, db: Session = Depends(get_db)):
    """删除指定策略配置。"""
    strategy = db.query(StrategyConfig).filter(StrategyConfig.id == strategy_id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")

    db.delete(strategy)
    db.commit()
    return {"message": "Strategy deleted successfully"}
