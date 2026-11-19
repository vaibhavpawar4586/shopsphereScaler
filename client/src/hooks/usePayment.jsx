import { useCallback, useState } from 'react';
import api from '../utils/api';
import urlConfig from '../utils/urlConfig';
import { loadRazorpayScript } from '../utils/razorpay';
import MockPaymentModal from '../components/mockPayment/MockPaymentModal';

/**
 * Starts a payment for a booking and resolves with what happened:
 *   { status: 'paid', booking }      payment verified by the server
 *   { status: 'failed', booking }    (mock mode) a failed payment was simulated
 *   { status: 'dismissed' }          the customer closed the payment window
 *
 * With Razorpay keys on the server it opens Razorpay Checkout; otherwise it shows
 * the mock payment dialog. Render `paymentUI` somewhere in the page.
 */
const usePayment = () => {
  const [mockSession, setMockSession] = useState(null);

  const pay = useCallback(async ({ booking, payment }) => {
    if (payment.mode === 'mock') {
      return new Promise((resolve) => setMockSession({ booking, payment, resolve }));
    }

    await loadRazorpayScript();
    return new Promise((resolve, reject) => {
      const razorpay = new window.Razorpay({
        key: payment.keyId,
        amount: payment.amount,
        currency: payment.currency,
        name: payment.name,
        description: payment.description,
        order_id: payment.orderId,
        prefill: payment.prefill,
        theme: { color: '#4f46e5' },
        timeout: 900, // seconds; the server cancels unpaid orders after 30 minutes
        // Called by Razorpay after a successful payment. The server must verify the signature.
        handler: async (response) => {
          try {
            const res = await api.post(urlConfig.VERIFY_PAYMENT_URL, { bookingId: booking._id, ...response });
            resolve({ status: 'paid', booking: res.data.data });
          } catch (err) {
            reject(err);
          }
        },
        modal: { ondismiss: () => resolve({ status: 'dismissed' }) },
      });
      // On failure Razorpay shows the error and lets the customer retry inside the popup.
      razorpay.open();
    });
  }, []);

  const finishMock = async (outcome) => {
    const { booking, resolve } = mockSession;
    const res = await api.post(`${urlConfig.BOOKING_URL}/${booking._id}/mock-pay`, { outcome });
    setMockSession(null);
    resolve({ status: outcome === 'success' ? 'paid' : 'failed', booking: res.data.data });
  };

  const closeMock = () => {
    mockSession.resolve({ status: 'dismissed' });
    setMockSession(null);
  };

  const paymentUI = mockSession ? (
    <MockPaymentModal payment={mockSession.payment} onResult={finishMock} onClose={closeMock} />
  ) : null;

  return { pay, paymentUI };
};

export default usePayment;
