/**
 * 统一响应包 { code, data, message }（契约 §1）。
 * 业务错误 HTTP 仍为 200 + 业务 code；鉴权失败 401；服务端异常 500。
 */

export const ok = (data = null, message = 'ok') => ({ code: 0, data, message });

export const fail = (code, message, data = null) => ({ code, data, message });

/** 错误码（契约 §1 / v0.2） */
export const ERR = {
  MODERATION: 1001, // 内容未通过安全检测
  WORD_COUNT: 1002, // 字数不足
  REJECTED: 1003, // 对方已拒绝接收
  QUOTA: 1004, // 每日推荐已用完
  GROUP_LIMIT: 1005, // 活跃书信组数已达上限
  BAD_REQUEST: 9001, // 参数 / 权限 / 数据库错误
  TIMEOUT: 9002, // 超时
};

/** 可预期的业务错误：errorHandler 捕获后返回 200 + { code, message } */
export class AppError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}
