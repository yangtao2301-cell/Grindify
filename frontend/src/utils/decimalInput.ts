/**
 * 将逗号统一为句点并解析为浮点数。
 * 空输入或无效输入返回 0。
 */
export function parseDecimalInput(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0
  const normalized = String(value).replace(',', '.')
  const num = parseFloat(normalized)
  return isNaN(num) ? 0 : num
}

/**
 * 解析为整数（向下取整），并处理逗号小数分隔符。
 * 空输入或无效输入返回 0。
 */
export function parseIntInput(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0
  const normalized = String(value).replace(',', '.')
  const num = Math.floor(parseFloat(normalized))
  return isNaN(num) ? 0 : num
}

/**
 * 将数字格式化为小数文本字段的显示值。
 * null/undefined 返回空字符串，使字段显示为空。
 */
export function formatDecimalDisplay(value: number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

/**
 * 将原始输入字符串中的逗号统一为句点。
 * 用作小数文本字段的 @update:model-value 处理器，允许使用“.”或“,”作为小数分隔符，
 * 同时保留“90.”这样的未完成输入。
 */
export function normalizeDecimalStr(value: string): string {
  return value.replace(',', '.')
}
