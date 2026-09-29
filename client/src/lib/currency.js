/**
 * Currency helpers — AgriMarket is a Bangladeshi marketplace, so every
 * monetary value is displayed in Bangladeshi Taka (৳).
 */
export const BDT_SYMBOL = '৳';

export const formatBDT = (value, { maximumFractionDigits = 2, minimumFractionDigits = 0 } = {}) => {
  const num = Number(value) || 0;
  return `${BDT_SYMBOL}${num.toLocaleString('en-IN', {
    maximumFractionDigits,
    minimumFractionDigits,
  })}`;
};