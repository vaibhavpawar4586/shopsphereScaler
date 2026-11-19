import { Link } from 'react-router-dom';
import useAuth from '../../context/auth/useAuth';
import useFetchData from '../../hooks/useFetchData';
import Loader from '../../components/loader/Loader';
import StatusBadge from '../../components/statusBadge/StatusBadge';
import AdminNav from './AdminNav';
import urlConfig from '../../utils/urlConfig';
import { formatDate, formatPrice, shortId } from '../../utils/format';
import './admin.css';

const StatCard = ({ label, value }) => (
  <div className="card stat-card">
    <span className="muted">{label}</span>
    <strong>{value}</strong>
  </div>
);

const AdminDashboard = () => {
  const { user, isAdmin } = useAuth();
  // Store-wide numbers are only for admins.
  const { data, error, isLoading } = useFetchData(isAdmin ? urlConfig.BOOKING_STATS_URL : null);
  const stats = data?.data;

  return (
    <main className="page">
      <h1 className="page-title">{isAdmin ? 'Admin dashboard' : 'Seller dashboard'}</h1>
      <AdminNav />

      {!isAdmin && (
        <div className="card">
          <p>Hi {user.name}, you can add and edit your products from the Products tab.</p>
          <Link to="/admin/products/new" className="btn">Add a product</Link>
        </div>
      )}

      {isAdmin && isLoading && !stats && <Loader />}
      {error && <div className="alert alert-error">{error}</div>}

      {stats && (
        <>
          <section className="stat-grid">
            <StatCard label="Revenue (paid orders)" value={formatPrice(stats.revenue)} />
            <StatCard label="Paid orders" value={stats.paidOrders} />
            <StatCard label="Awaiting payment" value={stats.pendingOrders} />
            <StatCard label="All orders" value={stats.totalOrders} />
            <StatCard label="Customers" value={stats.users} />
            <StatCard label="Products in store" value={stats.products} />
          </section>

          <div className="admin-two-col">
            <section className="card">
              <div className="row-between">
                <h2>Recent orders</h2>
                <Link to="/admin/orders">View all</Link>
              </div>
              {stats.recentOrders.length === 0 ? (
                <p className="muted">No orders yet.</p>
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {stats.recentOrders.map((b) => (
                        <tr key={b._id}>
                          <td><Link to={`/orders/${b._id}`}>{shortId(b._id)}</Link><div className="muted small">{formatDate(b.createdAt)}</div></td>
                          <td>{b.user?.name || '—'}</td>
                          <td>{formatPrice(b.totalAmount)}</td>
                          <td><StatusBadge booking={b} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="card">
              <h2>Low stock</h2>
              {stats.lowStock.length === 0 ? (
                <p className="muted">All products have 5 or more in stock.</p>
              ) : (
                <ul className="low-stock">
                  {stats.lowStock.map((p) => (
                    <li key={p._id}>
                      <Link to={`/admin/products/${p._id}/edit`}>{p.name}</Link>
                      <span className={p.stock_quantity === 0 ? 'stock-zero' : 'stock-low'}>{p.stock_quantity} left</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </main>
  );
};

export default AdminDashboard;
