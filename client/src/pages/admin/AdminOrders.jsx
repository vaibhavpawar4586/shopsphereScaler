import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import useFetchData from '../../hooks/useFetchData';
import Loader from '../../components/loader/Loader';
import Pagination from '../../components/pagination/Pagination';
import StatusBadge from '../../components/statusBadge/StatusBadge';
import AdminNav from './AdminNav';
import api, { getErrorMessage } from '../../utils/api';
import urlConfig from '../../utils/urlConfig';
import { formatDate, formatPrice, shortId } from '../../utils/format';
import './admin.css';

const FILTERS = [
  ['', 'All'],
  ['success', 'Paid'],
  ['pending', 'Awaiting payment'],
  ['cancelled', 'Cancelled'],
];

const AdminOrders = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') || '';
  const page = Number(searchParams.get('page')) || 1;
  const [message, setMessage] = useState({ type: '', text: '' });
  const [busyId, setBusyId] = useState(null);

  const params = new URLSearchParams({ page, limit: 20 });
  if (status) params.set('status', status);
  const { data, error, isLoading, refetch } = useFetchData(`${urlConfig.BOOKING_URL}?${params}`);
  const bookings = data?.data || [];

  const act = async (booking, action) => {
    if (action === 'cancel' && !window.confirm(`Cancel order ${shortId(booking._id)}?`)) return;
    setBusyId(booking._id);
    setMessage({ type: '', text: '' });
    try {
      const res =
        action === 'cancel'
          ? await api.patch(`${urlConfig.BOOKING_URL}/${booking._id}/admin-cancel`)
          : await api.patch(`${urlConfig.BOOKING_URL}/${booking._id}/delivery`, { deliveryStatus: action });
      setMessage({ type: 'success', text: res.data.message });
      refetch();
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="page">
      <h1 className="page-title">Orders</h1>
      <AdminNav />

      <div className="admin-filters">
        {FILTERS.map(([value, label]) => (
          <button
            type="button"
            key={value || 'all'}
            className={`btn btn-sm ${status === value ? '' : 'btn-secondary'}`}
            onClick={() => setSearchParams(value ? { status: value } : {})}
          >
            {label}
          </button>
        ))}
      </div>

      {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {isLoading && !data ? (
        <Loader />
      ) : (
        <section className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const busy = busyId === b._id;
                  return (
                    <tr key={b._id}>
                      <td>
                        <Link to={`/orders/${b._id}`}>{shortId(b._id)}</Link>
                        <div className="muted small">{formatDate(b.createdAt)}</div>
                        {b.needsReview && <div className="stock-zero small">Needs review</div>}
                      </td>
                      <td>
                        {b.user?.name || '—'}
                        <div className="muted small">{b.user?.email}</div>
                      </td>
                      <td>{b.items.reduce((n, i) => n + i.quantity, 0)}</td>
                      <td>{formatPrice(b.totalAmount)}</td>
                      <td><StatusBadge booking={b} /></td>
                      <td className="admin-actions">
                        {b.status === 'success' && b.deliveryStatus === 'processing' && (
                          <button type="button" className="btn btn-sm" disabled={busy} onClick={() => act(b, 'shipped')}>Mark shipped</button>
                        )}
                        {b.status === 'success' && b.deliveryStatus === 'shipped' && (
                          <button type="button" className="btn btn-sm" disabled={busy} onClick={() => act(b, 'delivered')}>Mark delivered</button>
                        )}
                        {(b.status === 'pending' || (b.status === 'success' && b.deliveryStatus !== 'delivered')) && (
                          <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => act(b, 'cancel')}>Cancel</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {bookings.length === 0 && <p className="muted">No orders found.</p>}
        </section>
      )}
      <Pagination
        totalPages={data?.pagination?.totalPages}
        currentPage={page}
        paginate={(p) => setSearchParams({ ...(status && { status }), page: String(p) })}
      />
    </main>
  );
};

export default AdminOrders;
