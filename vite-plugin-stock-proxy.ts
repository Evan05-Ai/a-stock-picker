/**
 * Vite 插件：本地股票数据代理
 * 通过 a-share-data Python 脚本（腾讯数据源）获取全市场行情/K线/指数，
 * 转为东方财富 API 兼容格式，供给前端。
 * 彻底绕过 push2.eastmoney.com 的网络问题。
 */
import type { Plugin, ViteDevServer } from 'vite'
import { spawn } from 'child_process'
import { join } from 'path'

const SKILL_DIR = join(process.env.USERPROFILE || '~', '.workbuddy', 'skills', 'a-share-data')
const PYTHON = join(process.env.USERPROFILE || '~', '.workbuddy', 'binaries', 'python', 'versions', '3.13.12', 'python.exe')

// ============================================================
//  通用 Python 执行工具
// ============================================================

function runPy(args: string[], timeoutMs = 30_000, extraEnv?: Record<string, string>): Promise<string> {
  return new Promise((resolve, reject) => {
    const scriptPath = join(SKILL_DIR, 'scripts', args[0])
    const scriptArgs = args.slice(1)
    const proc = spawn(PYTHON, ['-X', 'utf8', scriptPath, ...scriptArgs], {
      cwd: SKILL_DIR,
      timeout: timeoutMs,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1', LANG: 'zh_CN.UTF-8', LC_ALL: 'zh_CN.UTF-8' },
      windowsHide: true,
    })
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString('utf-8') })
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString('utf-8') })
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(`Python exit ${code}: ${stderr}`))
      resolve(stdout)
    })
    proc.on('error', (e) => reject(e))
  })
}

// ============================================================
//  缓存
// ============================================================

interface CacheEntry<T> { data: T; time: number }
let stockListCache: CacheEntry<PyStockItem[]> | null = null
let allQuoteCache: Record<string, PyStockItem> | null = null
const CACHE_TTL = 30_000

// ============================================================
//  数据格式
// ============================================================

interface PyStockItem {
  code: string; name: string; price: number; prev_close: number; open: number
  high: number; low: number; change_pct: number; volume: number; amount: number
  turnover_rate: number; pe: number; pb: number; amplitude: number
  market_cap: number; limit_up: number; limit_down: number
}

interface PyKline { date: string; open: number; close: number; high: number; low: number; volume: number; amount: number; amplitude: number; change_pct: number; change: number; turnover: number }

// ============================================================
//  全市场股票列表（500只）
// ============================================================

async function fetchAllStocks(): Promise<PyStockItem[]> {
  if (stockListCache && Date.now() - stockListCache.time < CACHE_TTL) {
    return stockListCache.data
  }
  const raw = await runPy(['fetch_realtime.py', '--all-quote', '--sort', 'change_pct_desc', '--top', '5000', '--json'], 45_000)
  const parsed = JSON.parse(raw)
  stockListCache = { data: parsed.data as PyStockItem[], time: Date.now() }
  // 建立快捷索引
  const map: Record<string, PyStockItem> = {}
  for (const s of (stockListCache.data)) {
    const pure = (s.code || '').replace(/^(sh|sz)/, '')
    map[pure] = s
  }
  allQuoteCache = map
  return stockListCache.data
}

// ============================================================
//  单只股票行情（不在Top500缓存内时按需查询）
// ============================================================

async function querySingleStock(code: string): Promise<PyStockItem | null> {
  // 用 Python 内联脚本：调用 fetch_realtime 的 get_realtime_quote，然后自动检测并标准化字段名
  const inlineScript = [
    'import json, sys, os',
    `sys.path.insert(0, os.path.join(os.environ.get("SKILL_DIR", os.path.expanduser("~/.workbuddy/skills/a-share-data")), "scripts"))`,
    'from fetch_realtime import get_realtime_quote',
    `data = get_realtime_quote("${code}")`,
    'if not data: sys.exit(1)',
    // 自动检测字段：按数值类型推断
    'numeric_keys = [k for k, v in data.items() if isinstance(v, (int, float)) and k != "浠ｇ爜" and k != "コ梧"]',
    'str_keys = [k for k, v in data.items() if isinstance(v, str)]',
    // 按位置推测字段含义（fetch_realtime 的 --quote 输出顺序固定）
    'keys = list(data.keys())',
    'code_val = str(data.get(keys[0], "") if keys else "")',
    'name_val = str(data.get(keys[1], "") if len(keys) > 1 else "")',
    'name_val = "" if name_val == code_val else name_val',
    'num_vals = [float(v) for k, v in data.items() if k not in (keys[0], keys[1]) and v is not None][:15]',
    '# 按顺序：price, prev_close, open, high, low, change_pct, volume, amount, turnover_rate, pe, pb, amplitude, market_cap, limit_up, limit_down',
    'while len(num_vals) < 15: num_vals.append(0)',
    'out = {"code": code_val, "name": name_val, "price": num_vals[0], "prev_close": num_vals[1], "open": num_vals[2], "high": num_vals[3], "low": num_vals[4], "change_pct": num_vals[5], "volume": num_vals[6], "amount": num_vals[7], "turnover_rate": num_vals[8], "pe": num_vals[9], "pb": num_vals[10], "amplitude": num_vals[11], "market_cap": num_vals[12], "limit_up": num_vals[13], "limit_down": num_vals[14]}',
    'print(json.dumps(out, ensure_ascii=False))',
  ].join('\n')
  const raw = await runPy(['-c', inlineScript], 15_000)
  if (!raw || raw.trim() === 'null' || raw.includes('"error"')) return null
  try {
    const d = JSON.parse(raw.trim())
    if (!d.code) return null
    const item: PyStockItem = {
      code: String(d.code),
      name: String(d.name),
      price: Number(d.price ?? 0),
      prev_close: Number(d.prev_close ?? d.price ?? 0),
      open: Number(d.open ?? d.price ?? 0),
      high: Number(d.high ?? d.price ?? 0),
      low: Number(d.low ?? d.price ?? 0),
      change_pct: Number(d.change_pct ?? 0),
      volume: Number(d.volume ?? 0),
      amount: Number(d.amount ?? 0),
      turnover_rate: Number(d.turnover_rate ?? 0),
      pe: Number(d.pe ?? 0),
      pb: Number(d.pb ?? 0),
      amplitude: Number(d.amplitude ?? 0),
      market_cap: Number(d.market_cap ?? 0),
      limit_up: Number(d.limit_up ?? 0),
      limit_down: Number(d.limit_down ?? 0),
    }
    if (!allQuoteCache) allQuoteCache = {}
    const pure = (item.code || '').replace(/^(sh|sz)/, '')
    allQuoteCache[pure] = item
    return item
  } catch {
    return null
  }
}

async function fetchIndices() {
  const raw = await runPy(['fetch_realtime.py', '--index', '--json'], 15_000)
  const parsed = JSON.parse(raw)
  const data: PyStockItem[] = parsed.data ?? []
  return data.map((item) => {
    const code = (item.code || '').replace(/^(sh|sz)/, '')
    const change = item.price - item.prev_close
    return {
      f2: item.price, f3: item.change_pct, f4: change, f6: item.amount,
      f12: code, f14: item.name,
    }
  })
}

// ============================================================
//  历史 K线（日线，120根）
// ============================================================

async function fetchKlines(code: string, count = 120) {
  // 适配代码格式：确保无前缀
  const pureCode = code.replace(/^(sh|sz)/, '')
  const raw = await runPy(['fetch_history.py', '--kline', pureCode, '--freq', 'd', '--count', String(count), '--json'], 20_000)
  // Python脚本直接返回数组 [{time,open,close,...}]，不是 {data: [...]}
  const parsed: Array<Record<string, unknown>> = JSON.parse(raw)
  const data = Array.isArray(parsed) ? parsed : []
  return data.map((k) => {
    const open = Number(k.open ?? 0)
    const close = Number(k.close ?? 0)
    const high = Number(k.high ?? 0)
    const low = Number(k.low ?? 0)
    const volume = Number(k.volume ?? 0)
    const amount = Number(k.amount ?? 0)
    const preclose = Number(k.preclose ?? close)
    const pctChg = Number(k.pctChg ?? 0)
    const date = String(k.time ?? '').replace(/-/g, '')
    // 振幅 = (最高-最低)/昨收*100
    const amplitude = preclose > 0 ? ((high - low) / preclose * 100) : 0
    // 涨跌额 = 收盘 - 昨收
    const change = close - preclose
    return `${date},${open},${close},${high},${low},${volume},${amount},${amplitude.toFixed(2)},${pctChg.toFixed(2)},${change.toFixed(2)},0`
  }).join('\n')
}

// ============================================================
//  格式转换
// ============================================================

function convertStocks(items: PyStockItem[]) {
  return items.map(item => {
    const cleanCode = (item.code || '').replace(/^(sh|sz)/, '')
    const change = item.price - item.prev_close
    return {
      f2: item.price ?? 0,
      f3: item.change_pct ?? 0,
      f4: change,
      f5: item.volume ?? 0,
      f6: item.amount ?? 0,
      f7: item.amplitude ?? 0,
      f8: item.turnover_rate ?? 0,
      f9: item.pe ?? 0,
      f10: 1,
      f12: cleanCode,
      f14: item.name,
      f15: item.high ?? item.price,
      f16: item.low ?? item.price,
      f17: item.prev_close ?? item.price,
      f20: (item.market_cap ?? 0) * 1e8,
      f21: 0,
      f23: item.pb ?? 0,
      f24: item.limit_up ?? 0,
      f25: item.limit_down ?? 0,
      f62: 0,
      f100: '',
      f115: 0,
      f128: '',
      f140: '',
      f141: '',
    }
  })
}

function convertSingleQuote(item: PyStockItem) {
  const cleanCode = (item.code || '').replace(/^(sh|sz)/, '')
  return {
    f43: item.price ?? 0,
    f44: item.high ?? item.price,
    f45: item.low ?? item.price,
    f46: item.open ?? item.price,
    f47: item.volume ?? 0,
    f48: item.amount ?? 0,
    f50: 1, // volumeRatio
    f51: 0, f52: 0, f55: 0,
    f57: cleanCode,
    f58: item.name,
    f60: item.prev_close ?? item.price,
    f116: (item.market_cap ?? 0) * 1e8,
    f117: 0,
    f162: item.pe ?? 0,
    f167: item.pb ?? 0,
    f168: item.turnover_rate ?? 0,
    f169: item.price - item.prev_close,
    f170: item.change_pct ?? 0,
    f171: item.amplitude ?? 0,
  }
}

// ============================================================
//  Vite 插件
// ============================================================

export function stockProxyPlugin(): Plugin {
  return {
    name: 'vite-plugin-stock-proxy',
    configureServer(server: ViteDevServer) {
      const jsonHeader = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

      // ── 全市场股票列表 ──
      server.middlewares.use('/a-stock-picker/api/local-stocks', async (_req, res) => {
        try {
          const stocks = await fetchAllStocks()
          const items = convertStocks(stocks)
          res.writeHead(200, jsonHeader)
          res.end(JSON.stringify({ data: { total: items.length, diff: items } }))
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e)
          res.writeHead(503, jsonHeader)
          res.end(JSON.stringify({ error: msg }))
        }
      })

      // ── 单股行情 ──
      server.middlewares.use('/a-stock-picker/api/local-quote', async (req, res) => {
        try {
          await fetchAllStocks() // 确保缓存热
          const url = new URL(req.url!, `http://${req.headers.host}`)
          const code = (url.searchParams.get('code') || url.pathname.split('/').pop() || '').replace(/^(sh|sz)/, '')
          const item = allQuoteCache?.[code]
          if (!item) {
            res.writeHead(404, jsonHeader)
            res.end(JSON.stringify({ error: `stock '${code}' not found in top 5000` }))
            return
          }
          res.writeHead(200, jsonHeader)
          res.end(JSON.stringify({ data: convertSingleQuote(item) }))
        } catch (e: unknown) {
          res.writeHead(503, jsonHeader)
          res.end(JSON.stringify({ error: String(e) }))
        }
      })

      // ── K线数据 ──
      server.middlewares.use('/a-stock-picker/api/local-kline', async (req, res) => {
        try {
          const url = new URL(req.url!, `http://${req.headers.host}`)
          const code = url.searchParams.get('code') || ''
          const count = parseInt(url.searchParams.get('count') || '120', 10)
          if (!code) {
            res.writeHead(400, jsonHeader)
            res.end(JSON.stringify({ error: 'code required' }))
            return
          }
          const raw = await fetchKlines(code, count)
          res.writeHead(200, jsonHeader)
          res.end(JSON.stringify({ data: { klines: raw } }))
        } catch (e: unknown) {
          res.writeHead(503, jsonHeader)
          res.end(JSON.stringify({ error: String(e) }))
        }
      })

      // ── 大盘指数 ──
      server.middlewares.use('/a-stock-picker/api/local-indices', async (_req, res) => {
        try {
          const indices = await fetchIndices()
          res.writeHead(200, jsonHeader)
          res.end(JSON.stringify({ data: { diff: indices } }))
        } catch (e: unknown) {
          res.writeHead(503, jsonHeader)
          res.end(JSON.stringify({ error: String(e) }))
        }
      })
    },
  }
}
