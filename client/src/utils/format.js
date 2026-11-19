const rupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export const formatPrice = (amount) => rupees.format(Number(amount) || 0);

export const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '';

export const shortId = (id) => `#${String(id).slice(-8).toUpperCase()}`;

export const discountPercent = (price, discount) => (price > 0 && discount > 0 ? Math.round((discount / price) * 100) : 0);

// Capitalises the first letter of each word ("men's clothing" -> "Men's Clothing").
export const capitalize = (text) => String(text || '').replace(/(^|\s)(\S)/g, (_, space, c) => space + c.toUpperCase());

// Shown in the cart only; the server always recalculates the real total.
export const FREE_SHIPPING_FROM = 999;
export const SHIPPING_FEE = 49;
export const shippingFor = (subtotal) => (subtotal === 0 || subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE);
