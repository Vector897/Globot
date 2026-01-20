/**
 * UTC Time Utilities
 * 统一使用 UTC 时间的工具函数
 */

/**
 * 获取当前 UTC 时间的 ISO 字符串
 */
export const getUTCISOString = (): string => {
  return new Date().toISOString();
};

/**
 * 获取当前 UTC 时间戳（毫秒）
 */
export const getUTCTimestamp = (): number => {
  return Date.now();
};

/**
 * 格式化 UTC 时间为显示字符串
 * @param date - Date 对象、ISO 字符串或时间戳
 * @param format - 格式选项
 */
export const formatUTCTime = (
  date: Date | string | number,
  format: 'time' | 'date' | 'datetime' | 'full' = 'datetime'
): string => {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'UTC',
  };

  switch (format) {
    case 'time':
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.second = '2-digit';
      options.hour12 = false;
      break;
    case 'date':
      options.year = 'numeric';
      options.month = '2-digit';
      options.day = '2-digit';
      break;
    case 'datetime':
      options.year = 'numeric';
      options.month = '2-digit';
      options.day = '2-digit';
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.second = '2-digit';
      options.hour12 = false;
      break;
    case 'full':
      options.year = 'numeric';
      options.month = 'long';
      options.day = 'numeric';
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.second = '2-digit';
      options.hour12 = false;
      options.weekday = 'long';
      break;
  }

  return d.toLocaleString('en-US', options) + ' UTC';
};

/**
 * 格式化 UTC 时间为简短时间字符串 (HH:MM:SS)
 */
export const formatUTCTimeShort = (date?: Date | string | number): string => {
  const d = date 
    ? (typeof date === 'string' || typeof date === 'number' ? new Date(date) : date)
    : new Date();
  
  return d.toLocaleTimeString('en-US', {
    timeZone: 'UTC',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

/**
 * 格式化 UTC 日期时间为中文显示格式
 * @param date - Date 对象、ISO 字符串或时间戳
 */
export const formatUTCDateTimeCN = (date: Date | string | number): string => {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  
  return d.toLocaleString('zh-CN', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }) + ' UTC';
};

/**
 * 获取 UTC 时间的各个部分
 */
export const getUTCParts = (date?: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
} => {
  const d = date || new Date();
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    second: d.getUTCSeconds(),
    millisecond: d.getUTCMilliseconds()
  };
};

/**
 * 计算两个时间之间的差值（毫秒）
 */
export const getTimeDiff = (
  start: Date | string | number,
  end: Date | string | number
): number => {
  const startTime = typeof start === 'string' || typeof start === 'number' 
    ? new Date(start).getTime() 
    : start.getTime();
  const endTime = typeof end === 'string' || typeof end === 'number'
    ? new Date(end).getTime()
    : end.getTime();
  
  return endTime - startTime;
};

/**
 * 格式化时间差为可读字符串
 */
export const formatTimeDiff = (diffMs: number): string => {
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}天 ${hours % 24}小时`;
  if (hours > 0) return `${hours}小时 ${minutes % 60}分钟`;
  if (minutes > 0) return `${minutes}分钟 ${seconds % 60}秒`;
  return `${seconds}秒`;
};

