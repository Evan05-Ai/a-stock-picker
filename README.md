# A股智能选股系统

一个功能完整的股票分析与选股网站，支持实时行情、智能选股、策略回测、AI分析等功能。

## ⚠️ 重要说明（必读）

### 当前部署状态
- ✅ **静态页面已部署**：网站可以通过GitHub Pages访问
- ❌ **后端API未运行**：GitHub Pages仅支持静态文件，无法运行Python FastAPI后端
- ⚠️ **功能受限**：除了策略回测（纯前端实现）外，其他需要后端API的功能目前无法使用

### 问题原因
本项目的架构包含：
- **前端**：HTML/CSS/JavaScript（可部署到GitHub Pages）
- **后端**：Python FastAPI + akshare数据获取（需要Python运行环境）

GitHub Pages是**静态网站托管服务**，无法运行Python代码，因此后端API无法正常工作。

---

## 📋 解决方案

### 方案1：部署后端到支持Python的平台（推荐）

#### 步骤1：准备后端部署

1. **注册Render/Railway/Heroku账号**（推荐Render，有免费额度）
2. **连接GitHub仓库**：`Evan05-Ai/a-stock-picker`
3. **配置后端服务**：
   - 根目录：`backend`
   - 启动命令：`uvicorn server:app --host 0.0.0.0 --port $PORT`
   - 环境变量：无特殊要求

#### 步骤2：修改前端API地址

部署成功后，修改 `js/api.js` 中的 `API_BASE` 变量：

```javascript
// 修改前
const API_BASE = 'http://localhost:8000';

// 修改后（替换为你的后端部署地址）
const API_BASE = 'https://your-backend-service.onrender.com';
```

#### 步骤3：重新部署前端

```bash
git add js/api.js
git commit -m "更新后端API地址"
git push origin main
```

---

### 方案2：使用纯前端 + 第三方API

如果不想部署后端，可以修改前端代码，直接调用第三方股票API：

#### 可用的免费API：
1. **新浪财经API**（实时行情）
2. **东方财富API**（K线数据）
3. **腾讯股票API**（实时数据）

#### 修改示例（以实时行情为例）：

```javascript
// 替换原有的API调用
async function fetchStockData(code) {
    // 原有方式（需要后端）
    // const response = await fetch(`${API_BASE}/stock/${code}`);
    
    // 新方式（直接调用第三方API）
    const response = await fetch(`https://hq.sinajs.cn/list=${code}`);
    const data = await response.text();
    return parseSinaData(data);
}
```

---

### 方案3：使用模拟数据（开发测试用）

如果只是想看到页面效果，可以暂时使用模拟数据：

```javascript
// 在 js/api.js 中添加模拟数据
const MOCK_DATA = {
    "600000": { code: "600000", name: "浦发银行", price: 8.50, change: 0.15 },
    // ... 更多模拟数据
};

async function fetchStockData(code) {
    // 返回模拟数据
    return { code: 0, data: MOCK_DATA[code] };
}
```

---

## 🚀 快速开始（本地开发）

### 1. 克隆项目

```bash
git clone https://github.com/Evan05-Ai/a-stock-picker.git
cd a-stock-picker
```

### 2. 启动后端（需要Python）

```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

后端将在 `http://localhost:8000` 运行

### 3. 启动前端

**方法1：使用VSCode Live Server插件**
- 安装Live Server插件
- 右键 `index.html` → Open with Live Server

**方法2：使用Python简易服务器**
```bash
cd a-stock-picker
python -m http.server 8080
```
访问 `http://localhost:8080`

**方法3：使用Node.js**
```bash
npx serve
```

---

## 📁 项目结构

```
a-stock-picker/
├── index.html              # 主页
├── pages/                 # 各功能页面
│   ├── stock-data.html    # 实时行情
│   ├── smart-pick.html    # 智能选股
│   ├── backtest.html      # 策略回测
│   └── ai-analysis.html   # AI分析
├── css/                   # 样式文件
│   └── style.css
├── js/                    # JavaScript文件
│   └── api.js            # API调用封装
├── backend/              # Python后端
│   ├── server.py         # FastAPI服务器
│   └── requirements.txt  # Python依赖
└── .github/
    └── workflows/
        └── deploy.yml    # GitHub Actions配置
```

---

## 🔧 功能模块说明

### ✅ 策略回测
- **状态**：正常工作
- **原因**：纯前端实现，使用本地计算
- **功能**：模拟交易策略，计算收益率、最大回撤等指标

### ⚠️ 实时行情
- **状态**：需要后端API
- **功能**：显示股票实时价格、涨跌幅、成交量等

### ⚠️ 智能选股
- **状态**：需要后端API
- **功能**：根据技术指标筛选股票

### ⚠️ AI分析
- **状态**：需要后端API
- **功能**：使用AI模型分析股票走势

---

## 🐛 常见问题

### Q1：为什么提示"获取数据失败"？
**A**：因为后端API没有运行。GitHub Pages无法运行Python代码，需要按照上述"解决方案"章节部署后端。

### Q2：策略回测为什么能正常工作？
**A**：因为策略回测是纯前端实现，所有计算都在浏览器中完成，不需要调用后端API。

### Q3：如何在本地测试所有功能？
**A**：按照"快速开始"章节，同时启动后端（端口8000）和前端（端口8080）。

### Q4：部署到GitHub Pages后，其他人能看到完整功能吗？
**A**：不能。需要额外部署后端服务，并修改前端API地址。

---

## 📝 开发笔记

### 已完成的配置
- ✅ 项目结构创建
- ✅ GitHub仓库推送
- ✅ GitHub Actions自动部署配置
- ✅ 前端页面开发
- ✅ 后端API开发

### 待完成的工作
- ❌ 后端服务部署（Render/Railway等平台）
- ❌ 前端API地址配置
- ❌ 第三方API集成（可选）

---

## 📧 联系方式

如有问题，请提交Issue或联系开发者。

---

**最后更新**：2026-05-09
**项目地址**：https://github.com/Evan05-Ai/a-stock-picker
**在线演示**：https://evan05-ai.github.io/a-stock-picker/
