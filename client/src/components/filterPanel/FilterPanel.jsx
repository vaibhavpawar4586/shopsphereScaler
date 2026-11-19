import { useEffect, useState } from 'react';
import { FaStar } from 'react-icons/fa';
import { formatPrice } from '../../utils/format';
import './filterPanel.css';

export const PRICE_PRESETS = [
  { label: 'Under ₹500', min: '', max: '500' },
  { label: '₹500 – ₹2,000', min: '500', max: '2000' },
  { label: '₹2,000 – ₹10,000', min: '2000', max: '10000' },
  { label: '₹10,000 – ₹50,000', min: '10000', max: '50000' },
  { label: 'Over ₹50,000', min: '50000', max: '' },
];
const RATING_OPTIONS = [4, 3, 2];
const DISCOUNT_OPTIONS = [10, 25, 40];
const BRANDS_SHOWN = 8;

const Section = ({ title, onClear, children }) => (
  <section className="filter-section">
    <div className="filter-section-head">
      <h3>{title}</h3>
      {onClear && (
        <button type="button" className="btn-link filter-clear" onClick={onClear}>Clear</button>
      )}
    </div>
    {children}
  </section>
);

/**
 * Sidebar with price, brand, rating, discount and availability filters.
 * `filters` holds the current values (strings from the URL); `onChange` receives the changed keys.
 * `facets` comes from GET /api/product/filters (brand counts and price range for this search).
 */
const FilterPanel = ({ filters, facets, onChange, onClearAll, activeCount }) => {
  const [minInput, setMinInput] = useState(filters.minPrice);
  const [maxInput, setMaxInput] = useState(filters.maxPrice);
  const [showAllBrands, setShowAllBrands] = useState(false);

  // Keep the inputs in sync when filters change from elsewhere (presets, chips, "clear all").
  useEffect(() => {
    setMinInput(filters.minPrice);
    setMaxInput(filters.maxPrice);
  }, [filters.minPrice, filters.maxPrice]);

  const selectedBrands = filters.brand ? filters.brand.split(',') : [];
  // Selected brands stay visible even if the other filters leave them with 0 products.
  const brandList = [...(facets?.brands || [])];
  for (const name of selectedBrands) {
    if (!brandList.some((b) => b.name === name)) brandList.push({ name, count: 0 });
  }
  const visibleBrands = showAllBrands ? brandList : brandList.slice(0, BRANDS_SHOWN);

  const toggleBrand = (name) => {
    const next = selectedBrands.includes(name) ? selectedBrands.filter((b) => b !== name) : [...selectedBrands, name];
    onChange({ brand: next.join(',') });
  };

  const applyCustomPrice = (event) => {
    event.preventDefault();
    let min = minInput.trim();
    let max = maxInput.trim();
    if (min && max && Number(min) > Number(max)) [min, max] = [max, min];
    onChange({ minPrice: min, maxPrice: max });
  };

  const priceActive = Boolean(filters.minPrice || filters.maxPrice);
  const range = facets?.price;

  return (
    <div className="filter-panel">
      <div className="filter-panel-head">
        <h2>Filters</h2>
        {activeCount > 0 && (
          <button type="button" className="btn-link" onClick={onClearAll}>Clear all ({activeCount})</button>
        )}
      </div>

      <Section title="Price" onClear={priceActive ? () => onChange({ minPrice: '', maxPrice: '' }) : null}>
        <ul className="filter-options">
          {PRICE_PRESETS.map((preset) => {
            const checked = filters.minPrice === preset.min && filters.maxPrice === preset.max;
            return (
              <li key={preset.label}>
                <label>
                  <input
                    type="radio"
                    name="price"
                    checked={checked}
                    onChange={() => onChange({ minPrice: preset.min, maxPrice: preset.max })}
                  />
                  {preset.label}
                </label>
              </li>
            );
          })}
        </ul>
        <form className="filter-price-form" onSubmit={applyCustomPrice}>
          <input
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="Min ₹"
            value={minInput}
            onChange={(e) => setMinInput(e.target.value)}
            aria-label="Minimum price"
          />
          <span>to</span>
          <input
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="Max ₹"
            value={maxInput}
            onChange={(e) => setMaxInput(e.target.value)}
            aria-label="Maximum price"
          />
          <button type="submit" className="btn btn-secondary btn-sm">Go</button>
        </form>
        {range && range.max > 0 && (
          <p className="filter-hint">Prices here: {formatPrice(range.min)} – {formatPrice(range.max)}</p>
        )}
      </Section>

      {brandList.length > 0 && (
        <Section title="Brand" onClear={selectedBrands.length ? () => onChange({ brand: '' }) : null}>
          <ul className="filter-options">
            {visibleBrands.map((b) => (
              <li key={b.name}>
                <label>
                  <input type="checkbox" checked={selectedBrands.includes(b.name)} onChange={() => toggleBrand(b.name)} />
                  <span className="filter-option-label">{b.name}</span>
                  <span className="filter-count">{b.count}</span>
                </label>
              </li>
            ))}
          </ul>
          {brandList.length > BRANDS_SHOWN && (
            <button type="button" className="btn-link filter-more" onClick={() => setShowAllBrands((v) => !v)}>
              {showAllBrands ? 'Show fewer' : `Show all ${brandList.length} brands`}
            </button>
          )}
        </Section>
      )}

      <Section title="Customer rating" onClear={filters.minRating ? () => onChange({ minRating: '' }) : null}>
        <ul className="filter-options">
          {RATING_OPTIONS.map((stars) => (
            <li key={stars}>
              <label>
                <input
                  type="radio"
                  name="rating"
                  checked={filters.minRating === String(stars)}
                  onChange={() => onChange({ minRating: String(stars) })}
                />
                <span className="filter-stars">{stars}<FaStar aria-hidden="true" /></span> & up
              </label>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Discount" onClear={filters.minDiscount ? () => onChange({ minDiscount: '' }) : null}>
        <ul className="filter-options">
          {DISCOUNT_OPTIONS.map((pct) => (
            <li key={pct}>
              <label>
                <input
                  type="radio"
                  name="discount"
                  checked={filters.minDiscount === String(pct)}
                  onChange={() => onChange({ minDiscount: String(pct) })}
                />
                {pct}% off or more
              </label>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Availability">
        <label className="filter-toggle">
          <input
            type="checkbox"
            checked={filters.inStock === 'true'}
            onChange={(e) => onChange({ inStock: e.target.checked ? 'true' : '' })}
          />
          In stock only
        </label>
      </Section>
    </div>
  );
};

export default FilterPanel;
