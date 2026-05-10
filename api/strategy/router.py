"""策略路由聚合入口。"""

from fastapi import APIRouter

from .routes.configs import router as configs_router

# 根路径接口不能作为无前缀子路由挂载，所以由各子路由保留完整前缀。
router = APIRouter()

router.include_router(configs_router)
