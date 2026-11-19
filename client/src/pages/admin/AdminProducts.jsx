import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import useFetchData from '../../hooks/useFetchData';
import Loader from '../../components/loader/Loader';
import Pagination from '../../components/pagination/Pagination';
import ProductImage from '../../components/productImage/ProductImage';
import AdminNav from './AdminNav';
import api, { getErrorMessage } from '../../utils/api';
import urlConfig from '../../utils/urlConfig';
import { capitalize, formatPrice } from '../../utils/format';
import './admin.css';

const AdminProducts = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page')) || 1;
  const q = searchParams.get('q') || '';
  const [search, setSearch] = useState(q);
  const [message, setMessage] = useState({ type: '', text: '' });

  const params = new URLSearchParams({ page, limit: 15, sort: 'newest' });
  if (q) params.set('q', q);
  const { data, error, isLoading, refetch } = useFetchData(`${urlConfig.ADMIN_PRODUCTS_URL}?${params}`);
  const products = data?.data || [];

  const onSearch = (event) => {
    event.preventDefault();
    setSearchParams(search.trim() ? { q: search.trim() } : {});
  };

  const setActive = async (product, isActive) => {
    if (!isActive && !window.confirm(`Remove "${product.name}" from the store? Past orders are not affected.`)) return;
    try {
      if (isActive) {
        await api.patch(`${urlConfig.ALL_PRODUCT_URL}/${product._id}`, { isActive: true });
      } else {
        await api.delete(`${urlConfig.ALL_PRODUCT_URL}/${product._id}`);
      }
      setMessage({ type: 'success', text: isActive ? 'Product is back in the store.' : 'Product removed from the store.' });
      refetch();
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err) });
    }
  };

  return (
    <main className="page">
      <h1 className="page-title">Products</h1>
      <AdminNav />

      <div className="row-between admin-toolbar">
        <form className="row" onSubmit={onSearch}>
          <input type="search" placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search products" />
          <button type="submit" className="btn btn-secondary">Search</button>
        </form>
        <Link to="/admin/products/new" className="btn">Add product</Link>
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
                <tr><th /><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th /></tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p._id} className={p.isActive ? '' : 'row-inactive'}>
                    <td><div className="admin-thumb"><ProductImage src={p.productImages[0]} alt="" /></div></td>
                    <td>
                      <div className="admin-product-name">{p.name}</div>
                      <div className="muted small">{p.brand}</div>
                    </td>
                    <td>{p.categories.map(capitalize).join(', ')}</td>
                    <td>
                      {formatPrice(p.finalPrice)}
                      {p.discount > 0 && <div className="muted small">MRP {formatPrice(p.price)}</div>}
                    </td>
                    <td className={p.stock_quantity < 5 ? 'stock-low' : ''}>{p.stock_quantity}</td>
                    <td>{p.isActive ? 'Live' : 'Hidden'}</td>
                    <td className="admin-actions">
                      <Link to={`/admin/products/${p._id}/edit`} className="btn btn-secondary btn-sm">Edit</Link>
                      {p.isActive ? (
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => setActive(p, false)}>Remove</button>
                      ) : (
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setActive(p, true)}>Restore</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {products.length === 0 && <p className="muted">No products found.</p>}
        </section>
      )}
      <Pagination
        totalPages={data?.pagination?.totalPages}
        currentPage={page}
        paginate={(p) => setSearchParams({ ...(q && { q }), page: String(p) })}
      />
    </main>
  );
};

export default AdminProducts;
