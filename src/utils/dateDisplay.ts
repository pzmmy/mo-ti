import { parseDashDateParts, parseSlashDateParts, type DateParts } from './dateStringParts'

export type DateDisplayFormat = 'us' | 'european' | 'friendly' | 'iso' | 'zh-cn'

export const DEFAULT_DATE_DISPLAY_FORMAT: DateDisplayFormat = 'friendly'
export const DATE_DISPLAY_FORMATS: readonly DateDisplayFormat[] = ['us', 'european', 'friendly', 'iso', 'zh-cn']

const FRIENDLY_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

const ZH_CN_DAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const

function isDateDisplayFormat(value: string): value is DateDisplayFormat {
  return DATE_DISPLAY_FORMATS.includes(value as DateDisplayFormat)
}

export function normalizeDateDisplayFormat(value: unknown): DateDisplayFormat | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  return isDateDisplayFormat(normalized) ? normalized : null
}

function twoDigit(value: number): string {
  return String(value).padStart(2, '0')
}

export function formatDatePartsForDisplay(
  parts: DateParts,
  format: DateDisplayFormat = DEFAULT_DATE_DISPLAY_FORMAT,
): string {
  if (format === 'us') return `${parts.month}/${parts.day}/${parts.year}`
  if (format === 'european') return `${parts.day}/${parts.month}/${parts.year}`
  if (format === 'iso') return `${parts.year}-${twoDigit(parts.month)}-${twoDigit(parts.day)}`
  if (format === 'zh-cn') {
    const date = new Date(parts.year, parts.month - 1, parts.day)
    const dayOfWeek = date.getDay()
    return `${parts.year}年${parts.month}月${parts.day}日 ${ZH_CN_DAYS[dayOfWeek]}`
  }
  return `${FRIENDLY_MONTHS[parts.month - 1]} ${parts.day}, ${parts.year}`
}

function datePartsFromDate(date: Date): DateParts {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  }
}

export function formatDateForDisplay(
  date: Date,
  format: DateDisplayFormat = DEFAULT_DATE_DISPLAY_FORMAT,
): string {
  return formatDatePartsForDisplay(datePartsFromDate(date), format)
}

export function formatTimestampForDateDisplay(
  timestampSeconds: number | null | undefined,
  format: DateDisplayFormat = DEFAULT_DATE_DISPLAY_FORMAT,
): string {
  if (!timestampSeconds) return ''
  return formatDateForDisplay(new Date(timestampSeconds * 1000), format)
}

export function parseDateDisplayParts(value: string): DateParts | null {
  return parseDashDateParts(value) ?? parseSlashDateParts(value)
}

export function formatDateValueForDisplay(
  value: string,
  format: DateDisplayFormat = DEFAULT_DATE_DISPLAY_FORMAT,
): string {
  const parts = parseDateDisplayParts(value)
  return parts ? formatDatePartsForDisplay(parts, format) : value
}
