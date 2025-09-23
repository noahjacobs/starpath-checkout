// Utility functions for formatting numbers and currencies

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatNumber = (number) => {
  return new Intl.NumberFormat('en-US').format(number);
};

export const formatPrice = (price) => {
  // For prices over $1000, show with thousands separator
  if (price >= 1000) {
    return formatCurrency(price);
  }
  return `$${price.toFixed(2)}`;
};
