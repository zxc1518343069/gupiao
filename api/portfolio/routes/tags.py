"""组合标签相关接口。"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import PortfolioTagDefinition, SelfSelectedStock

from ...dependencies import get_db
from ..schemas import TagDefinitionRequest
from ..utils.tags import (
    collect_tag_usage,
    get_stock_tags,
    get_tag_definitions as load_tag_definitions,
    normalize_tag_color,
    normalize_tag_name,
    rename_tag_across_portfolio,
    serialize_tag_definition,
)

router = APIRouter(tags=["portfolio"])


@router.get("/tag-definitions")
def get_tag_definitions(db: Session = Depends(get_db)):
    """返回标签定义，并附带每个标签当前被多少只股票使用。"""
    definitions = load_tag_definitions(db)
    stocks = db.query(SelfSelectedStock).all()
    usage_counts, _ = collect_tag_usage(stocks)

    return {
        "data": [
            serialize_tag_definition(definition, usage_counts.get(definition.name, 0))
            for definition in definitions
        ]
    }


@router.get("/tags/overview")
def get_tag_overview(db: Session = Depends(get_db)):
    """返回标签管理页概览，包括已定义标签、自定义标签和使用明细预览。"""
    definitions = load_tag_definitions(db)
    stocks = db.query(SelfSelectedStock).all()
    usage_counts, stock_previews = collect_tag_usage(stocks)
    definition_names = {definition.name for definition in definitions}

    # custom_tags 来自股票 notes 中存在、但还没有正式定义颜色的标签。
    custom_tags = [
        {
            "name": tag_name,
            "usage_count": usage_count,
            "stocks": stock_previews.get(tag_name, []),
        }
        for tag_name, usage_count in usage_counts.items()
        if tag_name not in definition_names
    ]
    custom_tags.sort(key=lambda item: (-item["usage_count"], item["name"]))

    tagged_stock_count = sum(1 for stock in stocks if get_stock_tags(stock.notes))

    return {
        "data": {
            "definitions": [
                serialize_tag_definition(definition, usage_counts.get(definition.name, 0))
                for definition in definitions
            ],
            "custom_tags": custom_tags,
            "tagged_stock_count": tagged_stock_count,
        }
    }


@router.post("/tag-definitions")
def add_tag_definition(request: TagDefinitionRequest, db: Session = Depends(get_db)):
    """创建标签定义；首次调用时会先确保默认标签存在。"""
    load_tag_definitions(db)

    name = normalize_tag_name(request.name)
    color = normalize_tag_color(request.color)
    if not name:
        raise HTTPException(status_code=400, detail="Tag name is required")

    existing = db.query(PortfolioTagDefinition).filter(PortfolioTagDefinition.name == name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Tag already exists")

    definition = PortfolioTagDefinition(name=name, color=color)
    db.add(definition)
    db.commit()
    db.refresh(definition)

    usage_counts, _ = collect_tag_usage(db.query(SelfSelectedStock).all())
    return {
        "message": "Tag definition created successfully",
        "data": serialize_tag_definition(definition, usage_counts.get(definition.name, 0)),
    }


@router.put("/tag-definitions/{definition_id}")
def update_tag_definition(
    definition_id: int,
    request: TagDefinitionRequest,
    db: Session = Depends(get_db),
):
    """更新标签定义，并把股票备注中使用的旧标签名同步改成新名称。"""
    definition = db.query(PortfolioTagDefinition).filter(PortfolioTagDefinition.id == definition_id).first()
    if not definition:
        raise HTTPException(status_code=404, detail="Tag definition not found")

    name = normalize_tag_name(request.name)
    color = normalize_tag_color(request.color)
    if not name:
        raise HTTPException(status_code=400, detail="Tag name is required")

    existing = (
        db.query(PortfolioTagDefinition)
        .filter(
            PortfolioTagDefinition.name == name,
            PortfolioTagDefinition.id != definition_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Tag already exists")

    previous_name = definition.name
    definition.name = name
    definition.color = color
    # 标签归属目前存放在 SelfSelectedStock.notes 的 JSON 中，改名时需要逐只股票同步。
    rename_tag_across_portfolio(db, previous_name, name)

    db.commit()
    db.refresh(definition)

    usage_counts, _ = collect_tag_usage(db.query(SelfSelectedStock).all())
    return {
        "message": "Tag definition updated successfully",
        "data": serialize_tag_definition(definition, usage_counts.get(definition.name, 0)),
    }


@router.delete("/tag-definitions/{definition_id}")
def delete_tag_definition(definition_id: int, db: Session = Depends(get_db)):
    """删除标签定义本身，不主动删除股票 notes 中的同名自定义标签。"""
    definition = db.query(PortfolioTagDefinition).filter(PortfolioTagDefinition.id == definition_id).first()
    if not definition:
        raise HTTPException(status_code=404, detail="Tag definition not found")

    db.delete(definition)
    db.commit()
    return {"message": "Tag definition deleted successfully"}
