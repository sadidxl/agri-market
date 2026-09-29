import { API_BASE_URL } from '@/lib/api';

export const getImageUrl = (imageUrl) => {
  if (typeof imageUrl !== 'string' || !imageUrl.trim()) return '/placeholder.svg';
  let value = imageUrl.trim().replace(/\\/g, '/');
  if (/^(https?:\/\/|data:image\/|blob:)/i.test(value)) return value;
  if (value.startsWith('//')) return value;
  value = value.replace(/^\.\//, '').replace(/^\/?(?:server\/)?uploads\//, '/uploads/');
  if (value.startsWith('/uploads/')) {
    const apiRoot = API_BASE_URL.replace(/\/+$/, '').replace(/\/api$/i, '');
    return `${apiRoot}${value}`;
  }
  return value.startsWith('/') ? value : `/${value}`;
};
