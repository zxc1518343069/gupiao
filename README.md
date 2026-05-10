# 股票量化辅助分析系统

一个本地运行的股票观察与量化辅助工具。后端使用 FastAPI、SQLAlchemy 和 Pandas，前端使用 React、TypeScript、Vite 和 Ant Design。系统直接读取本机通达信行情文件，提供自选股分组、行业分组、标签管理、策略配置、均线/乖离率/量比分析等能力。

## 核心功能

- 自选股、ETF、行业分组和标签管理。
- 读取通达信 `.day` 日线数据，计算 MA5、MA10、MA20、MA60、MA120。
- 计算均线斜率、乖离率、前 5 日均量量比、持仓区间收益等指标。
- 根据放量、均线趋势、收敛等条件生成观察信号和操作建议。
- 支持 FastAPI 接口和 React 管理界面，也保留 `main.py` 批量扫描脚本。

## 数据来源与配置

本项目不内置行情数据库。数据库和行情数据是两部分：

- 本地数据库：默认使用 SQLite 文件 `data.db`，由 `database.py` 中的 SQLAlchemy 模型在后端启动时自动创建。它主要保存自选股、分组、标签、策略配置和分析记录，不保存完整日线行情。该文件属于个人本地运行数据，已在 `.gitignore` 中忽略。
- 股票行情：来自本机通达信安装目录下的 `vipdoc` 日线文件，例如 `sz/lday/sz000001.day`、`sh/lday/sh600000.day`。后端接口和分析服务会直接读取这些 `.day` 文件。
- 股票名称和行业信息：读取通达信 `T0002/hq_cache` 下的 `szs.tnf`、`shs.tnf`、`bjs.tnf`、`tdxhy.cfg`、`tdxzs*.cfg`、`specgpext.txt` 等本地缓存文件。

配置入口在根目录 [config.py](config.py)：

```powershell
# 当前 PowerShell 窗口内设置，按自己的通达信安装路径调整
$env:TDX_VIPDOC_PATH = "D:\tdx\vipdoc"
$env:TDX_HQ_CACHE_PATH = "D:\tdx\T0002\hq_cache"

# 可选：修改数据库位置，默认是 sqlite:///./data.db
$env:DATABASE_URL = "sqlite:///./data.db"
```

如果不设置环境变量，项目会默认查找 `data/vipdoc`，适合放置脱敏的本地测试数据。真实通达信数据、SQLite 数据库、CSV 导出结果都不建议提交到 GitHub。

## 本地启动

后端：

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn server:app --reload
```

前端：

```powershell
cd web
npm install
npm run dev
```

默认前端开发服务会通过 [web/vite.config.ts](web/vite.config.ts) 把 `/api` 代理到 `http://127.0.0.1:8000`。也可以在 Windows 下运行 `start.bat` 同时启动后端和前端。

生产构建：

```powershell
cd web
npm run build
cd ..
uvicorn server:app
```

构建后 `server.py` 会在存在 `web/dist` 时托管前端静态资源。

## 批量扫描脚本

除 Web 应用外，项目保留命令行批量扫描能力：

```powershell
python main.py
```

`main.py` 会读取 `data/` 下的 `.day` 文件，转换到 `csvData/`，并把扫描结果输出到 `results/`。这些目录是本地生成数据，默认不会提交。

## 目录结构

- `server.py`：FastAPI 应用入口，注册接口路由并托管前端构建产物。
- `database.py`：SQLite/SQLAlchemy 数据模型和轻量 schema 兼容逻辑。
- `config.py`：通达信行情目录、数据库地址等本地配置。
- `api/`：后端接口分层，包含股票数据、自选股、策略、标签和分析接口。
- `services/`：行情读取、指标计算、股票元数据解析等服务逻辑。
- `web/`：React + TypeScript 前端应用。
- `main.py`、`convert_tdx.py`：可选的命令行批量转换与扫描脚本。

## 发布前说明

仓库已忽略 `node_modules`、`web/dist`、`__pycache__`、`.idea`、`.learnings`、`data.db`、行情数据和扫描结果目录。上传 GitHub 前请确认没有手动添加本地数据库、真实行情文件或个人 IDE 配置。
