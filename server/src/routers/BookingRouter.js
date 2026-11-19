const express = require('express');
const {
    initialBookingController,
    getPaymentConfig,
    verifyPaymentController,
    mockPaymentController,
    getMyBookings,
    getBookingById,
    getPaymentForBooking,
    cancelMyBooking,
    getAllBookings,
    updateDeliveryStatus,
    adminCancelBooking,
    getBookingStats,
} = require('../controllers/bookingController');
const { protectRouteMiddleWare, isAdminMiddleWare } = require('../middlewares/authMiddleware');

// Note: POST /api/booking/webhook is registered in app.js, because it needs the raw request body.
const BookingRouter = express.Router();

BookingRouter.get('/config', getPaymentConfig);

BookingRouter.use(protectRouteMiddleWare);

// Fixed paths first, so they are not captured by "/:bookingId".
BookingRouter.post('/', initialBookingController);
BookingRouter.post('/verify', verifyPaymentController);
BookingRouter.get('/my', getMyBookings);
BookingRouter.get('/stats', isAdminMiddleWare, getBookingStats);
BookingRouter.get('/', isAdminMiddleWare, getAllBookings);

BookingRouter.get('/:bookingId', getBookingById);
BookingRouter.get('/:bookingId/pay', getPaymentForBooking);
BookingRouter.post('/:bookingId/mock-pay', mockPaymentController);
BookingRouter.patch('/:bookingId/cancel', cancelMyBooking);
BookingRouter.patch('/:bookingId/delivery', isAdminMiddleWare, updateDeliveryStatus);
BookingRouter.patch('/:bookingId/admin-cancel', isAdminMiddleWare, adminCancelBooking);

module.exports = BookingRouter;
