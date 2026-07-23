# A股智能选股系统

一个纯前端的 A 股分析与选股 Web 应用，支持实时行情、个股多维诊断、条件选股与策略回测。所有计算均在浏览器端完成，无需任何后端服务即可部署运行。

> ⚠️ 本项目仅供学习与研究使用，**不构成任何投资建议**。

---

## ✨ 功能特性

| 模块 | 说明 |
|------|------|
| **首页 · 市场总览** | 大盘指数、涨跌家数、板块动态与热门个股一览 |
| **诊断股票** | 输入代码或名称，输出六维评分（技术面 / 基本面 / 资金面等）与 K 线走势图 |
| **智能选股** | 基于策略条件（均线、MACD、量价、估值等）从全市场股票池中批量筛选 |
| **策略回测** | 纯前端回测引擎，计算收益率、最大回撤、胜率等核心指标 |
| **关于** | 项目说明与数据来源声明 |

---

## 🧱 技术栈

- **框架**：React 18 + TypeScript + Vite 6
- **UI 组件**：Ant Design 5
- **图表**：ECharts 5（`echarts-for-react`）
- **路由**：React Router 6（HashRouter，天然适配静态托管子路径）
- **PWA**：`vite-plugin-pwa`（支持安装到桌面 / 离线缓存）
- **状态与工具**：`ahooks`、`dayjs`

---

## 📡 数据源架构

项目根据运行环境自动切换数据源，无需手动改配置：

| 环境 | 实时行情 / 大盘 | K 线 | 备注 |
|------|----------------|------|------|
| **开发环境**（`npm run dev`） | 东方财富 `push2.eastmoney.com`（JSONP） | 东方财富 | 经本地 Vite 代理转发，绕过 DNS / 跨域限制 |
| **生产环境**（已部署站点） | 腾讯财经 `qt.gtimg.cn` | 新浪 `money.finance.sina.com.cn` | 东方财富接口被封后的稳定 fallback |

- **股票池**：`public/stock-codes.json`，覆盖约 4907 只非科创板 A 股（由 akshare 生成）。
- **资金流数据**：生产环境下腾讯 / 新浪接口未提供主力资金流字段，相关指标暂显示为零，属已知限制。

---

## 🚀 快速开始

### 环境要求

- Node.js 18+（推荐 20+）

### 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev
```

浏览器访问 `http://localhost:5173/`。

> 💡 若本地 `node` 命令不可用，请确认 Node.js 已加入系统 `PATH`，或使用 nvm / 独立 Node 运行时。

### 构建与预览

```bash
npm run build      # 类型检查 + 生产构建，产物输出到 dist/
npm run preview    # 本地预览构建产物
```

---

## 🌐 部署

项目使用 **GitHub Pages** 托管，通过 `gh-pages` 分支发布：

```bash
npm run deploy     # 等价于 build 后推送到 gh-pages 分支
```

- 线上地址：**https://evan05-ai.github.io/a-stock-picker/**
- 构建时使用 `VITE_BASE_PATH='/a-stock-picker/'` 适配 GitHub Pages 子路径（HashRouter 无需服务端路由重写）。

---

## 📁 项目结构

```
a-stock-picker/
├── index.html                 # 应用入口
├── vite.config.ts             # Vite 配置（含开发代理、PWA、base path）
├── vite-plugin-stock-proxy.ts # 本地股票数据代理（绕过跨域 / DNS）
├── public/
│   ├── stock-codes.json       # 全市场 A 股代码池
│   └── manifest.json          # PWA 清单
├── src/
│   ├── api/                   # 数据源封装（eastmoney / tencent / sina）
│   ├── components/            # 复用组件（KLineChart、ScoreGauge 等）
│   ├── hooks/                 # 数据获取 Hook（useMarketData / useStockData）
│   ├── pages/                 # 页面（Home / Diagnosis / Selection / Backtest / About）
│   ├── strategies/            # 选股过滤、评分、回测逻辑
│   ├── types/                 # TypeScript 类型定义
│   ├── utils/                 # 工具函数（交易时间判断等）
│   ├── App.tsx                # 路由与布局
│   └── main.tsx               # 应用引导
└── deploy-gh-pages.sh         # GitHub Pages 部署脚本
```

---

## ⚠️ 已知限制

- **资金流指标**：生产环境下无可用主力资金流数据源，相关字段显示为零。
- **科创板**：当前股票池未包含科创板标的。
- **智能选股首次加载**：需对全市场约 4900 只股票分批请求，首次筛选约耗时 10–30 秒，属正常表现。
- **数据延迟**：行情数据来自第三方公开接口，存在分钟级延迟，不适用于实盘交易。

---

## 📄 许可证

MIT © Evan Chen

- 项目地址：https://github.com/Evan05-Ai/a-stock-picker
- 在线演示：https://evan05-ai.github.io/a-stock-picker/

**最后更新**：2026-07-23
