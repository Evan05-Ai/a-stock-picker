# 📈 A股智能选股系统

> 基于技术面、基本面、资金面的多维度 A 股智能选股与诊断系统

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18-61DAFB.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6.svg)
![Vite](https://img.shields.io/badge/Vite-6-646CFF.svg)

## ✨ 功能特性

### 🔍 股票诊断
输入任意 A 股代码，系统自动进行多维度分析：

- **技术面分析**：MACD 金叉/死叉、KDJ 超买超卖、RSI 强弱、均线排列、布林带位置、成交量分析
- **基本面分析**：PE/PB/ROE 估值、EPS/BPS、成长性评估
- **资金面分析**：主力资金净流入、超大单/大单/中单/小单流向
- **综合评分**：三维度加权评分（0-100），给出评级和操作建议
- **K线图表**：专业K线图叠加 MA5/MA10/MA20 均线，支持缩放

### 🏆 智能选股
多因子策略筛选，自动排除科创板（688）和 ST 股票：

- **综合策略**：全维度综合评分排名
- **趋势策略**：筛选上涨趋势中的股票
- **价值策略**：筛选低 PE 价值股
- **成长策略**：筛选强势高增长股
- **动量策略**：筛选放量活跃股
- 支持 PE、涨跌幅、换手率等多条件筛选

### 📊 大盘概览
- 上证指数、深证成指、创业板指实时行情
- 涨跌家数、涨停/跌停数统计
- 市场情绪指标（恐惧 ↔ 贪婪）

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite 6 |
| UI 组件 | Ant Design 5 |
| 图表 | ECharts 5 |
| 路由 | React Router 6 |
| 数据源 | 东方财富公开 API（免费） |

## 🚀 快速开始

### 本地开发

```bash
# 克隆项目
git clone https://github.com/Evan05-Ai/a-stock-picker.git
cd a-stock-picker

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 `http://localhost:5173/a-stock-picker/` 即可使用。

### 构建部署

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 📦 GitHub Pages 部署

项目已配置 GitHub Actions 自动部署：

1. Fork 或上传项目到你的 GitHub
2. 进入仓库 Settings → Pages
3. Source 选择 **GitHub Actions**
4. 推送到 `main` 分支即自动部署

访问地址：`https://Evan05-Ai.github.io/a-stock-picker/`

### 自定义部署路径

如果需要修改部署路径（例如使用自定义域名），编辑 `vite.config.ts` 中的 `BASE_PATH`：

```ts
// 根路径部署（自定义域名）
const BASE_PATH = '/'

// 子目录部署（GitHub Pages 默认）
const BASE_PATH = '/a-stock-picker/'
```

## 📁 项目结构

```
src/
├── api/              # API 接口层
│   ├── eastmoney.ts  # 东方财富数据接口
│   └── request.ts    # 请求封装
├── components/       # 通用组件
│   ├── KLineChart/   # K线图
│   └── ScoreGauge/   # 评分仪表盘
├── hooks/            # 自定义 Hooks
├── pages/            # 页面
│   ├── Home/         # 首页（大盘概览 + 推荐）
│   ├── Diagnosis/    # 股票诊断
│   ├── Selection/    # 智能选股
│   └── About/        # 关于
├── strategies/       # 策略引擎
│   ├── technical.ts  # 技术指标计算
│   ├── fundamental.ts # 基本面分析
│   ├── scoring.ts    # 综合评分系统
│   └── filters.ts    # 选股过滤器
├── types/            # TypeScript 类型
├── config.ts         # 全局配置
├── App.tsx           # 应用入口
└── main.tsx          # 入口文件
```

## ⚠️ 免责声明

- 本系统所有数据均来自东方财富公开接口，数据存在延迟，仅供参考
- 分析结果不构成任何投资建议，不保证任何收益
- 股市有风险，投资需谨慎，任何投资决策请自行判断，风险自担
- 本项目仅用于学习和技术研究目的

## 📄 License

[MIT](LICENSE) © [Evan Chen](https://github.com/Evan05-Ai)
