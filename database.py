import os

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, UniqueConstraint, create_engine, inspect
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
import datetime

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data.db")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# 自选股分组模型
class StockGroup(Base):
    __tablename__ = "stock_groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    params = Column(Integer, default=1, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

# 自选股模型
class SelfSelectedStock(Base):
    __tablename__ = "self_selected_stocks"

    id = Column(Integer, primary_key=True, index=True)
    stock_code = Column(String, unique=True, index=True)
    stock_name = Column(String)
    asset_type = Column(String, default="stock", nullable=False, index=True)
    group_name = Column(String, default="全部自选") # 新增分组字段
    is_self_selected = Column(Boolean, default=True, nullable=False, index=True)
    industry_group_name = Column(String, nullable=True, index=True)
    added_at = Column(DateTime, default=datetime.datetime.utcnow)
    notes = Column(String, nullable=True)


class StockGroupMembership(Base):
    __tablename__ = "stock_group_memberships"
    __table_args__ = (
        UniqueConstraint("stock_code", "group_name", "params", name="uq_stock_group_membership"),
    )

    id = Column(Integer, primary_key=True, index=True)
    stock_code = Column(String, nullable=False, index=True)
    group_name = Column(String, nullable=False, index=True)
    params = Column(Integer, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)


class PortfolioTagDefinition(Base):
    __tablename__ = "portfolio_tag_definitions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    color = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)


# 策略信号模型
class StrategySignal(Base):
    __tablename__ = "strategy_signals"

    id = Column(Integer, primary_key=True, index=True)
    stock_code = Column(String, index=True)
    trigger_date = Column(String)
    trigger_price = Column(Float)
    status = Column(String, default="观察中") # 观察中, 已止盈, 已止损
    target_profit = Column(Float)
    target_loss = Column(Float)


class StrategyConfig(Base):
    __tablename__ = "strategy_configs"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String, index=True)
    name = Column(String)
    conditions_json = Column(String)
    rule_json = Column(String, nullable=True)
    action = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)


class PortfolioAnalysisRun(Base):
    __tablename__ = "portfolio_analysis_runs"

    id = Column(Integer, primary_key=True, index=True)
    group_name = Column(String, index=True)
    analyzed_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    total_count = Column(Integer, default=0)
    matched_count = Column(Integer, default=0)
    unmatched_count = Column(Integer, default=0)
    error_count = Column(Integer, default=0)


class PortfolioAnalysisDetail(Base):
    __tablename__ = "portfolio_analysis_details"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, index=True)
    group_name = Column(String, index=True)
    stock_code = Column(String, index=True)
    stock_name = Column(String)
    is_triggered = Column(Boolean, default=False)
    status = Column(String, default="unmatched")  # matched, unmatched, error
    reason = Column(String, nullable=True)
    date = Column(String, nullable=True)
    close = Column(Float, nullable=True)
    vol_ratio = Column(Float, nullable=True)
    bias_str = Column(String, nullable=True)
    slope_str = Column(String, nullable=True)
    vol_status = Column(String, nullable=True)
    trend_str = Column(String, nullable=True)


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

        if "self_selected_stocks" in table_names and "industry_group_name" not in self_selected_stock_columns:
            connection.exec_driver_sql(
                "ALTER TABLE self_selected_stocks ADD COLUMN industry_group_name VARCHAR"
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
                "CREATE INDEX IF NOT EXISTS ix_self_selected_stocks_industry_group_name "
                "ON self_selected_stocks (industry_group_name)"
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

        if "self_selected_stocks" in table_names and "stock_group_memberships" in table_names:
            connection.exec_driver_sql(
                """
                INSERT OR IGNORE INTO stock_group_memberships (stock_code, group_name, params, created_at)
                SELECT stock_code, group_name, 1, added_at
                FROM self_selected_stocks
                WHERE group_name IS NOT NULL AND group_name != '全部自选'
                """
            )
            connection.exec_driver_sql(
                """
                INSERT OR IGNORE INTO stock_group_memberships (stock_code, group_name, params, created_at)
                SELECT stock_code, industry_group_name, 2, added_at
                FROM self_selected_stocks
                WHERE industry_group_name IS NOT NULL AND industry_group_name != ''
                """
            )
