import { useParams, useSearchParams } from 'react-router-dom';
import useFetchData from '../../hooks/useFetchData';
import Product from '../../components/product/Product';
import Loader from '../../components/loader/Loader';
import Pagination from '../../components/pagination/Pagination';
import urlConfig from '../../utils/urlConfig';
import { capitalize } from '../../utils/format';
import './productListing.css';

const ITEMS_PER_PAGE = 12;
const SORT_OPTIONS = [
  ['newest', 'Newest'],
  ['price_asc', 'Price: low to high'],
  ['price_desc', 'Price: high to low'],
  ['rating', 'Top rated'],
];

const ProductListing = () => {
  const { categoryName } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const sort = searchParams.get('sort') || 'newest';
  const currentPage = Number(searchParams.get('page')) || 1;

  // Search, filtering, sorting and paging all happen on the server.
  const params = new URLSearchParams({ page: currentPage, limit: ITEMS_PER_PAGE, sort });
  if (q) params.set('q', q);
  if (categoryName) params.set('category', categoryName);
  const { data, error, isLoading } = useFetchData(`${urlConfig.ALL_PRODUCT_URL}?${params}`, null);

  const products = data?.data || [];
  const pagination = data?.pagination;

  const updateParams = (changes) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  let title = 'All products';
  if (categoryName) title = capitalize(categoryName);
  if (q) title = `Results for "${q}"`;

  return (
    <main className="page">
      <div className="listing-header">
        <div>
          <h1 className="page-title">{title}</h1>
          {pagination && <p className="muted">{pagination.total} product{pagination.total === 1 ? '' : 's'}</p>}
        </div>
        <label className="listing-sort">
          <span>Sort by</span>
          <select value={sort} onChange={(e) => updateParams({ sort: e.target.value, page: '' })}>
            {SORT_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {isLoading && !data ? (
        <Loader label="Loading products" />
      ) : products.length === 0 && !error ? (
        <div className="empty-state">
          <h2>No products found</h2>
          <p>Try a different search or category.</p>
        </div>
      ) : (
        <>
          <div className={`product-list ${isLoading ? 'is-refreshing' : ''}`}>
            {products.map((product) => (
              <Product key={product._id} product={product} />
            ))}
          </div>
          <Pagination
            totalPages={pagination?.totalPages}
            currentPage={currentPage}
            paginate={(page) => updateParams({ page: page > 1 ? String(page) : '' })}
          />
        </>
      )}
    </main>
  );
};

export default ProductListing;
