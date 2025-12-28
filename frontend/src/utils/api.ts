/**
 * 获取 API 基础 URL
 * 在开发环境中返回完整的 URL，在生产环境中返回相对路径
 */
export const getApiBaseURL = (): string => {
  // 优先使用环境变量
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  // 开发环境使用 localhost:8080
  if (import.meta.env.DEV) {
    return 'http://localhost:8080';
  }
  // 生产环境（Docker）使用相对路径
  return '';
};

/**
 * 获取图片 URL
 * @param path 图片路径（相对于 uploads 目录）
 */
export const getImageURL = (path: string): string => {
  const baseURL = getApiBaseURL();
  // 如果 path 已经包含 http:// 或 https://，直接返回
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  // 移除开头的斜杠（如果有）
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${baseURL}/${cleanPath}`;
};

