import { fail, ERR, AppError } from '../utils/response.js';

/** 未匹配路由 → 404 + 统一响应包 */
export function notFound(req, res) {
  res.status(404).json(fail(ERR.BAD_REQUEST, '接口不存在'));
}

/** 全局错误处理：AppError → 200 + 业务 code；其余 → 500 + 9001（不泄露内部细节） */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(200).json(fail(err.code, err.message));
  }
  if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') {
    return res.status(400).json(fail(ERR.BAD_REQUEST, '请求体不合法'));
  }
  (req.log || console).error(err);
  return res.status(500).json(fail(ERR.BAD_REQUEST, '网络异常，请稍后重试'));
}
