import { useState } from 'react';
import { formatPrice } from '../../utils/format';
import { getErrorMessage } from '../../utils/api';
import './mockPayment.css';

/**
 * Stand-in for the Razorpay popup when the backend has no Razorpay keys (mock mode).
 * It lets you test a successful or failed payment locally.
 */
const MockPaymentModal = ({ payment, onResult, onClose }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const choose = async (outcome) => {
    setBusy(true);
    setError('');
    try {
      await onResult(outcome);
    } catch (err) {
      setError(getErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="mock-overlay" role="dialog" aria-modal="true" aria-labelledby="mock-title">
      <div className="mock-modal">
        <span className="mock-tag">Test mode</span>
        <h2 id="mock-title">Pay {formatPrice(payment.amount / 100)}</h2>
        <p className="muted">
          {payment.description}. Razorpay keys aren&apos;t set on the server, so this is a simulated payment. No money is charged.
        </p>
        {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
        <div className="stack">
          <button type="button" className="btn btn-block" disabled={busy} onClick={() => choose('success')}>
            Simulate successful payment
          </button>
          <button type="button" className="btn btn-danger btn-block" disabled={busy} onClick={() => choose('failure')}>
            Simulate failed payment
          </button>
          <button type="button" className="btn-link" disabled={busy} onClick={onClose}>
            Cancel and pay later
          </button>
        </div>
      </div>
    </div>
  );
};

export default MockPaymentModal;
