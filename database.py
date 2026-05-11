import os

from sqlalchemy import Boolean, Column, DateTime, Integer, String, UniqueConstraint, create_engine, inspect
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
import datetime

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data.db")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class StockGroup(Base):
    """自选股分组表，保存用户自定义分组和分组类型。"""

    __tablename__ = "stock_groups"

    id = Column(Integer, primary_key=True, index=True, comment="分组自增主键")
    name = Column(String, unique=True, index=True, comment="分组名称，同一数据库中保持唯一")
    params = Column(Integer, default=1, nullable=False, index=True, comment="分组类型标识，1 表示自选分组，2 表示行业分组")
    created_at = Column(DateTime, default=datetime.datetime.utcnow, comment="分组创建时间")


class SelfSelectedStock(Base):
    """自选股基础表，保存用户关注的股票、ETF 和相关备注。"""

    __tablename__ = "self_selected_stocks"

    id = Column(Integer, primary_key=True, index=True, comment="自选记录自增主键")
    stock_code = Column(String, unique=True, index=True, comment="证券代码，包含市场前缀，例如 sh600000、sz000001")
    stock_name = Column(String, comment="证券名称，来自通达信本地缓存或用户输入")
    asset_type = Column(String, default="stock", nullable=False, index=True, comment="资产类型，stock 表示股票，etf 表示 ETF")
    is_self_selected = Column(Boolean, default=True, nullable=False, index=True, comment="是否仍在自选列表中，False 表示已移出但可保留历史信息")
    added_at = Column(DateTime, default=datetime.datetime.utcnow, comment="加入自选列表的时间")
    notes = Column(String, nullable=True, comment="用户备注或跟踪说明")


class StockGroupMembership(Base):
    """股票与分组的多对多关系表，支持一只股票属于多个分组。"""

    __tablename__ = "stock_group_memberships"
    __table_args__ = (
        UniqueConstraint("stock_code", "group_name", "params", name="uq_stock_group_membership"),
    )

    id = Column(Integer, primary_key=True, index=True, comment="分组关系自增主键")
    stock_code = Column(String, nullable=False, index=True, comment="证券代码，关联 self_selected_stocks.stock_code")
    group_name = Column(String, nullable=False, index=True, comment="分组名称，关联 stock_groups.name")
    params = Column(Integer, nullable=False, index=True, comment="分组类型标识，和 stock_groups.params 含义一致")
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True, comment="股票加入该分组的时间")


class PortfolioTagDefinition(Base):
    """持仓标签定义表，保存可复用的标签名称和展示颜色。"""

    __tablename__ = "portfolio_tag_definitions"

    id = Column(Integer, primary_key=True, index=True, comment="标签定义自增主键")
    name = Column(String, unique=True, index=True, comment="标签名称，同一数据库中保持唯一")
    color = Column(String, nullable=False, comment="标签展示颜色，通常为十六进制颜色值")
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True, comment="标签创建时间")


class StrategyConfig(Base):
    """策略配置表，保存用户创建的买入、卖出和收敛等策略规则。"""

    __tablename__ = "strategy_configs"

    id = Column(Integer, primary_key=True, index=True, comment="策略配置自增主键")
    category = Column(String, index=True, comment="策略分类，例如买入、卖出、收敛或交易策略")
    name = Column(String, comment="策略名称，用于前端列表展示和用户识别")
    conditions_json = Column(String, comment="旧版策略条件 JSON，保留用于兼容历史配置")
    rule_json = Column(String, nullable=True, comment="新版策略规则 JSON，描述完整的触发条件和参数")
    action = Column(String, comment="策略触发后的操作建议或动作类型")
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True, comment="策略创建时间")


def ensure_database_schema():
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())
    if (
        "stock_groups" not in table_names
        and "self_selected_stocks" not in table_names
        and "stock_group_memberships" not in table_names
        and "strategy_configs" not in table_names
    ):
        return

    stock_group_columns = (
        {column["name"] for column in inspector.get_columns("stock_groups")}
        if "stock_groups" in table_names
        else set()
    )
    self_selected_stock_columns = (
        {column["name"] for column in inspector.get_columns("self_selected_stocks")}
        if "self_selected_stocks" in table_names
        else set()
    )
    stock_group_membership_columns = (
        {column["name"] for column in inspector.get_columns("stock_group_memberships")}
        if "stock_group_memberships" in table_names
        else set()
    )
    strategy_config_columns = (
        {column["name"] for column in inspector.get_columns("strategy_configs")}
        if "strategy_configs" in table_names
        else set()
    )

    with engine.begin() as connection:
        if "stock_groups" in table_names and "params" not in stock_group_columns:
            connection.exec_driver_sql(
                "ALTER TABLE stock_groups ADD COLUMN params INTEGER NOT NULL DEFAULT 1"
            )

        if "stock_groups" in table_names:
            connection.exec_driver_sql(
                "CREATE INDEX IF NOT EXISTS ix_stock_groups_params ON stock_groups (params)"
            )

        if "self_selected_stocks" in table_names and "is_self_selected" not in self_selected_stock_columns:
            connection.exec_driver_sql(
                "ALTER TABLE self_selected_stocks ADD COLUMN is_self_selected BOOLEAN NOT NULL DEFAULT 1"
            )

        if "self_selected_stocks" in table_names and "asset_type" not in self_selected_stock_columns:
            connection.exec_driver_sql(
                "ALTER TABLE self_selected_stocks ADD COLUMN asset_type VARCHAR NOT NULL DEFAULT 'stock'"
            )

        if "self_selected_stocks" in table_names:
            connection.exec_driver_sql(
                """
                UPDATE self_selected_stocks
                SET asset_type = CASE
                    WHEN stock_code LIKE 'sh51%' OR stock_code LIKE 'sh56%' OR stock_code LIKE 'sh58%'
                        OR stock_code LIKE 'sz15%'
                    THEN 'etf'
                    ELSE 'stock'
                END
                """
            )
            connection.exec_driver_sql(
                "CREATE INDEX IF NOT EXISTS ix_self_selected_stocks_is_self_selected "
                "ON self_selected_stocks (is_self_selected)"
            )
            connection.exec_driver_sql(
                "CREATE INDEX IF NOT EXISTS ix_self_selected_stocks_asset_type "
                "ON self_selected_stocks (asset_type)"
            )

        if "stock_group_memberships" in table_names:
            connection.exec_driver_sql(
                "CREATE INDEX IF NOT EXISTS ix_stock_group_memberships_stock_code "
                "ON stock_group_memberships (stock_code)"
            )
            connection.exec_driver_sql(
                "CREATE INDEX IF NOT EXISTS ix_stock_group_memberships_group_name "
                "ON stock_group_memberships (group_name)"
            )
            connection.exec_driver_sql(
                "CREATE INDEX IF NOT EXISTS ix_stock_group_memberships_params "
                "ON stock_group_memberships (params)"
            )
            if {"stock_code", "group_name", "params"}.issubset(stock_group_membership_columns):
                connection.exec_driver_sql(
                    "CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_group_membership "
                    "ON stock_group_memberships (stock_code, group_name, params)"
                )

        if "strategy_configs" in table_names and "rule_json" not in strategy_config_columns:
            connection.exec_driver_sql(
                "ALTER TABLE strategy_configs ADD COLUMN rule_json VARCHAR"
            )

        if (
            "self_selected_stocks" in table_names
            and "stock_group_memberships" in table_names
            and "group_name" in self_selected_stock_columns
        ):
            connection.exec_driver_sql(
                """
                INSERT OR IGNORE INTO stock_group_memberships (stock_code, group_name, params, created_at)
                SELECT stock_code, group_name, 1, added_at
                FROM self_selected_stocks
                WHERE group_name IS NOT NULL AND group_name != '全部自选'
                """
            )

        if (
            "self_selected_stocks" in table_names
            and "stock_group_memberships" in table_names
            and "industry_group_name" in self_selected_stock_columns
        ):
            connection.exec_driver_sql(
                """
                INSERT OR IGNORE INTO stock_group_memberships (stock_code, group_name, params, created_at)
                SELECT stock_code, industry_group_name, 2, added_at
                FROM self_selected_stocks
                WHERE industry_group_name IS NOT NULL AND industry_group_name != ''
                """
            )


def ensure_database_ready():
    """Create missing tables and apply lightweight schema compatibility updates."""
    Base.metadata.create_all(bind=engine)
    ensure_database_schema()
