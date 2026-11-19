import { discountPercent, formatPrice } from '../../utils/format';

/** Selling price, with the original price struck through and the % off when discounted. */
const PriceTag = ({ price, discount, finalPrice, large = false }) => {
  const off = discountPercent(price, discount);
  return (
    <div style={{ fontSize: large ? '1.6rem' : '1.05rem' }}>
      <span className="price">{formatPrice(finalPrice ?? price)}</span>
      {off > 0 && (
        <>
          <span className="price-mrp">{formatPrice(price)}</span>
          <span className="price-off">{off}% off</span>
        </>
      )}
    </div>
  );
};

export default PriceTag;
