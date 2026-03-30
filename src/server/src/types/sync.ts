// 第三方API响应数据结构
export interface SetupResponseVO {
  legalPersonIdCardImg: string      // 法人身份证图片
  enterpriseName: string            // 企业名称
  enterpriseAddress: string         // 企业地址
  legalPersonName: string           // 法人姓名
  legalPersonIdCard: string         // 法人身份证号
  legalPersonPhone: string          // 法人手机号
  enterpriseId: string              // 企业ID
  unifiedSocialCreditCode: string   // 统一社会信用代码
  registrationTime: string          // 注册时间 (格式: YYYY-MM-DD)
}

// 通用API响应
export interface ApiResponse {
  code: string | number  // 可能是字符串或数字
  msg: string
  data: unknown
  status?: number  // HTTP状态码
}
