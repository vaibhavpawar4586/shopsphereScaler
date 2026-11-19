// All API routes in one place.
// In development VITE_BASE_URL is empty and Vite proxies /api to the Express server.
export const BASE_URL = (import.meta.env.VITE_BASE_URL || '').replace(/\/+$/, '');

const urlConfig = {
  SIGNUP_URL: '/api/auth/signup',
  LOGIN_URL: '/api/auth/login',
  LOGOUT_URL: '/api/auth/logout',
  ME_URL: '/api/auth/me',
  FORGOT_PASSWORD_URL: '/api/auth/forgetpassword',
  RESET_PASSWORD_URL: '/api/auth/resetPassword',

  ALL_PRODUCT_URL: '/api/product',
  CATEGORIES_URL: '/api/product/categories',
  ADMIN_PRODUCTS_URL: '/api/product/admin/all',
  ADMIN_PRODUCT_URL: '/api/product/admin',

  BOOKING_URL: '/api/booking',
  MY_BOOKINGS_URL: '/api/booking/my',
  VERIFY_PAYMENT_URL: '/api/booking/verify',
  PAYMENT_CONFIG_URL: '/api/booking/config',
  BOOKING_STATS_URL: '/api/booking/stats',

  REVIEW_URL: '/api/review',
  USER_URL: '/api/user',
};

export default urlConfig;
