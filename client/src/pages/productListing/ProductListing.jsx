import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { FaFilter, FaTimes } from 'react-icons/fa';
import useFetchData from '../../hooks/useFetchData';
import Product from '../../components/product/Product';
import Loader from '../../components/loader/Loader';
import Pagination from '../../components/pagination/Pagination';
import FilterPanel, { PRICE_PRESETS } from '../../components/filterPanel/FilterPanel';
import urlConfig from '../../utils/urlConfig';
import { capitalize, formatPrice } from '../../utils/format';
import './productListing.css';

const ITEMS_PER_PAGE = 12;
const SORT_OPTIONS = [
  ['newest', 'Newest'],
  ['price_asc', 'Price: low to high'],
  ['price_desc', 'Price: high to low'],
  ['rating', 'Top rated'],
  ['discount', 'Biggest discount'],
];
// Every filter lives in the URL, so filtered pages can be bookmarked, shared and reloaded.
const FILTER_KEYS = ['brand', 'minPrice', 'maxPrice', 'minRating', 'minDiscount', 'inStock'];

/** Short labels for the "active filter" chips above the results. */
function activeChips(filters) {
  const chips = [];
  if (filters.brand) {
    filters.brand.split(',').forEach((brand) => chips.push({ key: 'brand', value: brand, label: brand }));
  }
  if (filters.minPrice || filters.maxPrice) {
    const preset = PRICE_PRESETS.find((p) => p.min === filters.minPrice && p.max === filters.maxPrice);
    let label = preset?.label;
    if (!label && filters.minPrice && filters.maxPrice) label = `${formatPrice(filters.minPrice)} – ${formatPrice(filters.maxPrice)}`;
    if (!label && filters.minPrice) label = `Over ${formatPrice(filters.minPrice)}`;
    if (!label) label = `Under ${formatPrice(filters.maxPrice)}`;
    chips.push({ key: 'price', label });
  }
  if (filters.minRating) chips.push({ key: 'minRating', label: `${filters.minRating}★ & up` });
  if (filters.minDiscount) chips.push({ key: 'minDiscount', label: `${filters.minDiscount}%+ off` });
  if (filters.inStock === 'true') chips.push({ key: 'inStock', label: 'In stock' });
  return chips;
}

const ProductListing = () => {
  const { categoryName } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  const q = searchParams.get('q') || '';
  const sort = searchParams.get('sort') || 'newest';
  const currentPage = Number(searchParams.get('page')) || 1;
  const filters = Object.fromEntries(FILTER_KEYS.map((key) => [key, searchParams.get(key) || '']));

  // Search, filtering, sorting and paging all happen on the server.
  const filterParams = new URLSearchParams();
  if (q) filterParams.set('q', q);
  if (categoryName) filterParams.set('category', categoryName);
  FILTER_KEYS.forEach((key) => filters[key] && filterParams.set(key, filters[key]));

  const listParams = new URLSearchParams(filterParams);
  listParams.set('page', currentPage);
  listParams.set('limit', ITEMS_PER_PAGE);
  listParams.set('sort', sort);

  const { data, error, isLoading } = useFetchData(`${urlConfig.ALL_PRODUCT_URL}?${listParams}`, null);
  const { data: facetsData } = useFetchData(`${urlConfig.PRODUCT_FILTERS_URL}?${filterParams}`, null);

  const products = data?.data || [];
  const pagination = data?.pagination;
  const chips = activeChips(filters);

  /** Changes some URL params; any filter change goes back to page 1. */
  const updateParams = (changes, { scroll = true } = {}) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    if (!('page' in changes)) next.delete('page');
    setSearchParams(next);
    if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearAll = () => updateParams(Object.fromEntries(FILTER_KEYS.map((key) => [key, ''])));

  const removeChip = (chip) => {
    if (chip.key === 'brand') {
      const rest = filters.brand.split(',').filter((b) => b !== chip.value);
      updateParams({ brand: rest.join(',') }, { scroll: false });
    } else if (chip.key === 'price') {
      updateParams({ minPrice: '', maxPrice: '' }, { scroll: false });
    } else {
      updateParams({ [chip.key]: '' }, { scroll: false });
    }
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
        <div className="listing-controls">
          <button
            type="button"
            className="btn btn-secondary listing-filter-toggle"
            onClick={() => setShowFilters((open) => !open)}
            aria-expanded={showFilters}
          >
            <FaFilter aria-hidden="true" /> Filters{chips.length ? ` (${chips.length})` : ''}
          </button>
          <label className="listing-sort">
            <span>Sort by</span>
            <select value={sort} onChange={(e) => updateParams({ sort: e.target.value })}>
              {SORT_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="listing-layout">
        <aside className={`listing-sidebar ${showFilters ? 'is-open' : ''}`}>
          <FilterPanel
            filters={filters}
            facets={facetsData?.data}
            onChange={(changes) => updateParams(changes, { scroll: false })}
            onClearAll={clearAll}
            activeCount={chips.length}
          />
        </aside>

        <section className="listing-results">
          {chips.length > 0 && (
            <div className="filter-chips">
              {chips.map((chip) => (
                <button type="button" key={`${chip.key}-${chip.label}`} className="filter-chip" onClick={() => removeChip(chip)}>
                  {chip.label} <FaTimes aria-label="Remove filter" />
                </button>
              ))}
              <button type="button" className="btn-link" onClick={clearAll}>Clear all</button>
            </div>
          )}

          {error && <div className="alert alert-error">{error}</div>}

          {isLoading && !data ? (
            <Loader label="Loading products" />
          ) : products.length === 0 && !error ? (
            <div className="empty-state">
              <h2>No products match</h2>
              <p>Try removing a filter or searching for something else.</p>
              {chips.length > 0 && <button type="button" className="btn" onClick={clearAll}>Clear all filters</button>}
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
        </section>
      </div>
    </main>
  );
};

export default ProductListing;
