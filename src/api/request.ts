/**
 * 通用请求封装
 */
import { REQUEST_TIMEOUT } from '@/config'

/** 通用 fetch 包装，带超时和错误处理 */
export async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    return (await res.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

/** JSONP 方式请求（用于东方财富跨域接口） */
export function fetchJSONP<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const cbName = `_jsonp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error('JSONP timeout'))
    }, REQUEST_TIMEOUT)

    function cleanup() {
      clearTimeout(timer)
      delete (window as unknown as Record<string, unknown>)[cbName]
      const script = document.getElementById(cbName)
      if (script) script.remove()
    }

    ;(window as unknown as Record<string, unknown>)[cbName] = (data: T) => {
      cleanup()
      resolve(data)
    }

    const script = document.createElement('script')
    script.id = cbName
    script.src = url.includes('?') ? `${url}&cb=${cbName}` : `${url}?cb=${cbName}`
    script.onerror = () => {
      cleanup()
      reject(new Error('JSONP request failed'))
    }
    document.head.appendChild(script)
  })
}
