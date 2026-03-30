/**
 * 统一响应格式工具类
 * 格式: {"code": number, "msg": string, "data": any}
 */

export interface ApiResponse<T = any> {
  code: number;
  msg: string;
  data: T;
}

// 响应码定义
export const ResponseCode = {
  SUCCESS: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
} as const;

// 响应消息定义
export const ResponseMessage = {
  SUCCESS: '操作成功',
  BAD_REQUEST: '请求参数错误',
  UNAUTHORIZED: '未授权访问',
  FORBIDDEN: '禁止访问',
  NOT_FOUND: '资源不存在',
  INTERNAL_ERROR: '服务器内部错误',
  INVALID_CREDENTIALS: '用户名或密码错误',
  EMAIL_EXISTS: '邮箱已被注册',
  USERNAME_EXISTS: '用户名已被占用',
  USER_NOT_FOUND: '用户不存在',
  PROJECT_NOT_FOUND: '项目不存在',
  TASK_NOT_FOUND: '任务不存在',
  NO_TOKEN: '未提供访问令牌',
  INVALID_TOKEN: '无效的访问令牌',
} as const;

/**
 * 创建成功响应
 * @param data 返回数据
 * @param msg 响应消息，默认为"操作成功"
 * @param code 响应码，默认为200
 */
export function success<T = any>(
  data: T,
  msg: string = ResponseMessage.SUCCESS,
  code: number = ResponseCode.SUCCESS
): ApiResponse<T> {
  return {
    code,
    msg,
    data,
  };
}

/**
 * 创建错误响应
 * @param msg 错误消息
 * @param code 错误码，默认为500
 * @param data 附加数据（可选）
 */
export function error<T = any>(
  msg: string = ResponseMessage.INTERNAL_ERROR,
  code: number = ResponseCode.INTERNAL_ERROR,
  data?: T
): ApiResponse<T | null> {
  return {
    code,
    msg,
    data: data || null,
  };
}

/**
 * 创建特定错误类型的响应
 */
export const ResponseUtil = {
  success: <T = any>(data?: T, msg?: string) => success(data, msg),

  badRequest: (msg: string = ResponseMessage.BAD_REQUEST) =>
    error(msg, ResponseCode.BAD_REQUEST),

  unauthorized: (msg: string = ResponseMessage.UNAUTHORIZED) =>
    error(msg, ResponseCode.UNAUTHORIZED),

  forbidden: (msg: string = ResponseMessage.FORBIDDEN) =>
    error(msg, ResponseCode.FORBIDDEN),

  notFound: (msg: string = ResponseMessage.NOT_FOUND) =>
    error(msg, ResponseCode.NOT_FOUND),

  internalError: (msg: string = ResponseMessage.INTERNAL_ERROR) =>
    error(msg, ResponseCode.INTERNAL_ERROR),

  invalidCredentials: () =>
    error(ResponseMessage.INVALID_CREDENTIALS, ResponseCode.UNAUTHORIZED),

  emailExists: () =>
    error(ResponseMessage.EMAIL_EXISTS, ResponseCode.BAD_REQUEST),

  usernameExists: () =>
    error(ResponseMessage.USERNAME_EXISTS, ResponseCode.BAD_REQUEST),

  userNotFound: () =>
    error(ResponseMessage.USER_NOT_FOUND, ResponseCode.NOT_FOUND),

  projectNotFound: () =>
    error(ResponseMessage.PROJECT_NOT_FOUND, ResponseCode.NOT_FOUND),

  taskNotFound: () =>
    error(ResponseMessage.TASK_NOT_FOUND, ResponseCode.NOT_FOUND),

  noToken: () =>
    error(ResponseMessage.NO_TOKEN, ResponseCode.UNAUTHORIZED),

  invalidToken: () =>
    error(ResponseMessage.INVALID_TOKEN, ResponseCode.UNAUTHORIZED),
};
