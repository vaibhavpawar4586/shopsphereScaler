import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import useFetchData from '../../hooks/useFetchData';
import usePayment from '../../hooks/usePayment';
import Loader from '../../components/loader/Loader';
import StatusBadge from '../../components/statusBadge/StatusBadge';
import ProductImage from '../../components/productImage/ProductImage';
import api, { getErrorMessage } from '../../utils/api';
import urlConfig from '../../utils/urlConfig';
import { formatDate, formatPrice, shortId } from '../../utils/format';
import './orders.css';

const HISTORY_LABELS = {
  placed: 'Order placed',
  paid: 'Payment received',
  payment_failed: 'Payment failed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const OrderDetail = () => {
  const { bookingId } = useParams();
  const location = useLocation();
  const { data, error, isLoading, setData } = useFetchData(`${urlConfig.BOOKING_URL}/${bookingId}`);
  const { pay, paymentUI } = usePayment();
  const [actionError, setActionError] = useState(location.state?.paymentError || '');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(() => {
    const result = location.state?.paymentResult;
    if (result === 'paid') return 'Payment successful - thank you for your order!';
    if (result === 'failed') return '';
    if (location.state?.justPlaced) return 'Your order is placed but not paid yet. Pay within 30 minutes to keep the items reserved.';
    return '';
  });

  if (isLoading && !data) return <Loader label="Loading order" />;
  if (error) {
    return (
      <main className="page empty-state">
        <h2>{error}</h2>
        <Link to="/orders">Back to my orders</Link>
      </main>
    );
  }

  const booking = data?.data;
  if (!booking) return null;
  const setBooking = (updated) => setData({ ...data, data: updated });

  const payNow = async () => {
    setBusy(true);
    setActionError('');
    setNotice('');
    try {
      const res = await api.get(`${urlConfig.BOOKING_URL}/${booking._id}/pay`);
      const result = await pay(res.data.data);
      if (result.booking) setBooking(result.booking);
      if (result.status === 'paid') setNotice('Payment successful - thank you for your order!');
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!window.confirm('Cancel this order?')) return;
    setBusy(true);
    setActionError('');
    try {
      const res = await api.patch(`${urlConfig.BOOKING_URL}/${booking._id}/cancel`);
      setBooking(res.data.data);
      setNotice('Your order has been cancelled.');
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const { shippingAddress: addr } = booking;

  return (
    <main className="page page-narrow">
      <Link to="/orders" className="muted">← My orders</Link>
      <div className="row-between order-head">
        <h1 className="page-title">Order {shortId(booking._id)}</h1>
        <StatusBadge booking={booking} />
      </div>
      <p className="muted order-date">Placed on {formatDate(booking.createdAt)}</p>

      {notice && <div className={`alert ${booking.status === 'success' ? 'alert-success' : 'alert-info'}`}>{notice}</div>}
      {booking.status === 'pending' && booking.failureReason && (
        <div className="alert alert-error">Last payment attempt failed: {booking.failureReason}. You can try again.</div>
      )}
      {actionError && <div className="alert alert-error">{actionError}</div>}

      {booking.status === 'pending' && (
        <div className="card order-pay">
          <div>
            <strong>Waiting for payment</strong>
            <p className="muted">Pay before {formatDate(booking.expiresAt)} or the order is cancelled automatically.</p>
          </div>
          <div className="row">
            <button type="button" className="btn btn-danger" onClick={cancel} disabled={busy}>Cancel order</button>
            <button type="button" className="btn" onClick={payNow} disabled={busy}>Pay {formatPrice(booking.totalAmount)}</button>
          </div>
        </div>
      )}

      <section className="card order-section">
        <h2>Items</h2>
        <ul className="order-items">
          {booking.items.map((item) => (
            <li key={item.product}>
              <div className="order-thumb"><ProductImage src={item.image} alt={item.name} /></div>
              <Link to={`/product/${item.product}`} className="order-item-name">{item.name}</Link>
              <span className="muted">{formatPrice(item.priceAtThatTime)} × {item.quantity}</span>
              <strong>{formatPrice(item.priceAtThatTime * item.quantity)}</strong>
            </li>
          ))}
        </ul>
        <div className="summary-line"><span>Subtotal</span><span>{formatPrice(booking.itemsTotal)}</span></div>
        <div className="summary-line"><span>Shipping</span><span>{booking.shippingFee ? formatPrice(booking.shippingFee) : 'Free'}</span></div>
        <div className="summary-line summary-total"><span>Total</span><span>{formatPrice(booking.totalAmount)}</span></div>
      </section>

      <div className="order-grid">
        <section className="card order-section">
          <h2>Shipping to</h2>
          <p className="order-address">
            <strong>{addr.fullName}</strong><br />
            {addr.line1}<br />
            {addr.line2 && <>{addr.line2}<br /></>}
            {addr.city}, {addr.state} {addr.pincode}<br />
            Phone: {addr.phone}
          </p>
        </section>

        <section className="card order-section">
          <h2>Timeline</h2>
          <ol className="timeline">
            {booking.history.map((entry, index) => (
              <li key={index} className={`timeline-${entry.status}`}>
                <strong>{HISTORY_LABELS[entry.status] || entry.status}</strong>
                <span className="muted">{formatDate(entry.at)}</span>
                {entry.note && entry.status !== 'placed' && <span className="muted">{entry.note}</span>}
              </li>
            ))}
          </ol>
          {booking.paymentId && <p className="muted order-payment-id">Payment ID: {booking.paymentId}</p>}
        </section>
      </div>
      {paymentUI}
    </main>
  );
};

export default OrderDetail;
