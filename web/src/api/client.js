/* T6.1 统一 fetch 封装：
   - 注入 Bearer token（读 auth store 的 localStorage 持久化）
   - 解析契约响应 { code, data, message }
   - 401 → 清登录态 + 跳登录页（派发 pc:unauthorized 事件，AuthProvider 兜底）
   - 9001 → toast「网络异常，请稍后重试」并抛出；9002 → 自动重试 1 次，仍失败再 toast 抛出
   - 业务错误（1001–1005）→ 原样抛给调用方处理
   页面禁止直连 fetch，一律经此层与各模块 api 文件。 */

const BASE = '/api/v1';
const AUTH_KEY = 'pc_auth';

/* 由 AppRoot 注入：toast（UI store）与 onUnauthorized（登出跳登录） */
let handlers = { toast: () => {}, onUnauthorized: () => {} };
export function setApiHandlers(next) {
  handlers = { ...handlers, ...next };
}

function readToken() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY) || '{}').token || '';
  } catch {
    return '';
  }
}

/* 抛给调用方的错误：带业务 code（0 之外），data 供个别接口（如 1002 附字数）使用 */
export class ApiError extends Error {
  constructor(code, message, data = null) {
    super(message || '请求失败');
    this.name = 'ApiError';
    this.code = code;
    this.data = data;
  }
}

const NET_MSG = '网络异常，请稍后重试';

/* 使用者电脑当地日期（YYYY-MM-DD）：随请求带给服务端，令「今天」按各人本地时间判定 */
function localDate() {
  const d = new Date();
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/* 单次网络往返：返回解析后的 { code, data, message }；HTTP 401 直接抛 ApiError(401) */
async function once(method, path, body) {
  const token = readToken();
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Date': localDate(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (res.status === 401) {
    handlers.onUnauthorized();
    throw new ApiError(401, '登录已失效，请重新登录');
  }
  try {
    return await res.json();
  } catch {
    // 非 JSON（如 500 HTML / 断链）按网络异常处理
    throw new ApiError(9002, NET_MSG);
  }
}

async function request(method, path, body, attempt = 0) {
  let json;
  try {
    json = await once(method, path, body);
  } catch (err) {
    if (err instanceof ApiError && err.code === 401) throw err;
    // fetch 抛出（断网/超时）或响应非 JSON：给 1 次重试机会
    if (attempt === 0) return request(method, path, body, attempt + 1);
    handlers.toast(NET_MSG);
    throw err instanceof ApiError ? err : new ApiError(9002, NET_MSG);
  }

  const { code, data, message } = json || {};
  if (code === 0) return data;

  // 9002 超时：自动重试 1 次
  if (code === 9002 && attempt === 0) return request(method, path, body, attempt + 1);
  // 9002（重试后仍失败）：统一网络异常 toast
  if (code === 9002) {
    handlers.toast(NET_MSG);
    throw new ApiError(code, message || NET_MSG, data);
  }
  // 9001（参数/权限/数据库/系统）：服务端 message 已面向用户（登录错误、信件不存在、
  // 500 兜底文案等），直接 toast 之，并抛出供调用方决定是否停在原页。
  if (code === 9001) {
    handlers.toast(message || NET_MSG);
    throw new ApiError(code, message || NET_MSG, data);
  }
  // 业务错误（1001 违规 / 1002 字数 / 1003 拒收 / 1004 额度 / 1005 组数）：
  // 不自动 toast，抛给调用方就地处理（不关页、给上下文提示）。
  throw new ApiError(code, message, data);
}

export const client = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  del: (path) => request('DELETE', path),
};
