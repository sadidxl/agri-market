import React, { useState } from 'react';
import { getImageUrl } from '@/lib/imageUrl';

// Resolve uploads consistently in grids, details, and dashboard tables.
export function ProductImage({ src, alt, ...props }) {
  const url = getImageUrl(src);
  const [failedUrl, setFailedUrl] = useState(null);
  return <img {...props} src={failedUrl === url ? '/placeholder.svg' : url} alt={alt}
    onError={() => setFailedUrl(url)} />;
}
