import { Link } from 'react-router-dom';
import useFetchData from '../../hooks/useFetchData';
import Loader from '../../components/loader/Loader';
import StatusBadge from '../../components/statusBadge/StatusBadge';
import ProductImage from '../../components/productImage/ProductImage';
import urlConfig from '../../utils/urlConfig';
import { formatDate, formatPrice, shortId } from '../../utils/format';
import './orders.css';

const Orders = () => {
  const { data, error, isLoading } = useFetchData(urlConfig.MY_BOOKINGS_URL);
  const bookings = data?.data || [];

  if (isLoading && !data) return <Loader label="Loading your orders" />;

  return (
    <main className="page page-narrow">
      <h1 className="page-title">My orders</h1>
      {error && <div className="alert alert-error">{error}</div>}

      {bookings.length === 0 && !error ? (
        <div className="empty-state">
          <h2>No orders yet</h2>
          <Link to="/" className="btn">Start shopping</Link>
        </div>
      ) : (
        <ul className="order-list">
          {bookings.map((booking) => (
            <li key={booking._id}>
              <Link to={`/orders/${booking._id}`} className="order-card card">
                <div className="order-card-images">
                  {booking.items.slice(0, 3).map((item) => (
                    <div key={item.product} className="order-thumb">
                      <ProductImage src={item.image} alt={item.name} />
                    </div>
                  ))}
                </div>
                <div className="order-card-info">
                  <div className="row-between">
                    <strong>Order {shortId(booking._id)}</strong>
                    <StatusBadge booking={booking} />
                  </div>
                  <span className="muted">
                    {formatDate(booking.createdAt)} · {booking.items.reduce((n, i) => n + i.quantity, 0)} item(s)
                  </span>
                  <span className="order-card-total">{formatPrice(booking.totalAmount)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
};

export default Orders;
