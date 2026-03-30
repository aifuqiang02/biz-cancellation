import mysql from 'mysql2/promise'

// MySQL 配置
const mysqlConfig = {
  host: '179.20.1.93',
  port: 2225,
  user: 'scjdglj',
  password: 'Sjj@202308#12',
  database: 'xixian_scjd_sjgs'
}

/**
 * 查询企业注册状态
 * @param unifiedSocialCreditCode 统一社会信用代码
 * @returns '开业' | '注销' | null
 */
export async function queryRegistrationStatus(
  unifiedSocialCreditCode: string
): Promise<string | null> {
  const connection = await mysql.createConnection(mysqlConfig)
  try {
    const [rows] = await connection.execute(
      'SELECT REGSTATE_CN FROM e_pb_baseinfo WHERE UniSCID = ?',
      [unifiedSocialCreditCode]
    )

    if (Array.isArray(rows) && rows.length > 0) {
      const row = rows[0] as any
      return row.REGSTATE_CN // "开业" 或 "注销"
    }
    return null
  } finally {
    await connection.end()
  }
}

/**
 * 批量查询企业注册状态
 * @param codes 统一社会信用代码数组
 * @returns Map<统一社会信用代码, 状态>
 */
export async function batchQueryRegistrationStatus(
  codes: string[]
): Promise<Map<string, string>> {
  const connection = await mysql.createConnection(mysqlConfig)
  const result = new Map<string, string>()

  try {
    const placeholders = codes.map(() => '?').join(',')
    const [rows] = await connection.execute(
      `SELECT UniSCID, REGSTATE_CN FROM e_pb_baseinfo WHERE UniSCID IN (${placeholders})`,
      codes
    )

    if (Array.isArray(rows)) {
      rows.forEach((row: any) => {
        result.set(row.UniSCID, row.REGSTATE_CN)
      })
    }

    return result
  } finally {
    await connection.end()
  }
}