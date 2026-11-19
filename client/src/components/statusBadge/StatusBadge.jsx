import './statusBadge.css';

const LABELS = {
  pending: ['Awaiting payment', 'warning'],
  cancelled: ['Cancelled', 'danger'],
  processing: ['Paid · Processing', 'info'],
  shipped: ['Shipped', 'info'],
  delivered: ['Delivered', 'success'],
  success: ['Paid', 'success'],
};

/** One label for an order, combining payment status and delivery status. */
export const orderStatusKey = (booking) => {
  if (booking.status === 'success') return booking.deliveryStatus || 'success';
  return booking.status;
};

const StatusBadge = ({ booking }) => {
  const key = orderStatusKey(booking);
  const [label, tone] = LABELS[key] || [key, 'info'];
  return <span className={`status-badge status-${tone}`}>{label}</span>;
};

export default StatusBadge;
