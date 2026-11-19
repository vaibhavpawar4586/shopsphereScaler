import { Link } from 'react-router-dom';
import AddToCart from '../addToCart/AddToCart';
import ProductImage from '../productImage/ProductImage';
import StarRating from '../starRating/StarRating';
import PriceTag from '../priceTag/PriceTag';
import './product.css';

const Product = ({ product }) => (
  <article className="product-item">
    <Link to={`/product/${product._id}`} className="product-image-link">
      <ProductImage src={product.productImages?.[0]} alt={product.name} className="product-image" />
    </Link>
    <div className="product-details">
      <span className="product-brand">{product.brand}</span>
      <Link to={`/product/${product._id}`} className="product-title" title={product.name}>
        {product.name}
      </Link>
      {product.ratingCount > 0 && <StarRating value={product.averageRating} count={product.ratingCount} />}
      <div className="buy-item">
        <PriceTag price={product.price} discount={product.discount} finalPrice={product.finalPrice} />
        <AddToCart product={product} />
      </div>
    </div>
  </article>
);

export default Product;
