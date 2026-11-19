import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import useFetchData from '../../hooks/useFetchData';
import useAuth from '../../context/auth/useAuth';
import { useCart } from '../../context/cart/useCart';
import Loader from '../../components/loader/Loader';
import ProductImage from '../../components/productImage/ProductImage';
import PriceTag from '../../components/priceTag/PriceTag';
import StarRating from '../../components/starRating/StarRating';
import AddToCart from '../../components/addToCart/AddToCart';
import api, { getErrorMessage } from '../../utils/api';
import urlConfig from '../../utils/urlConfig';
import { capitalize, formatDate } from '../../utils/format';
import './productDetail.css';

const ReviewForm = ({ productId, onAdded }) => {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!rating) {
      setError('Please choose a star rating');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post(`${urlConfig.REVIEW_URL}/${productId}`, { rating, review });
      setRating(0);
      setReview('');
      onAdded();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="form review-form card" onSubmit={submit}>
      <h3>Write a review</h3>
      <StarRating value={rating} onChange={setRating} size="lg" />
      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value)}
        placeholder="What did you like or dislike?"
        maxLength={1000}
        required
        minLength={3}
        aria-label="Review"
      />
      {error && <div className="alert alert-error">{error}</div>}
      <div>
        <button type="submit" className="btn" disabled={saving}>{saving ? 'Posting…' : 'Post review'}</button>
      </div>
    </form>
  );
};

const ProductDetail = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cart, addToCart } = useCart();
  const [imageIndex, setImageIndex] = useState(0);
  // Show the first picture again when moving to another product.
  useEffect(() => setImageIndex(0), [productId]);

  const { data, error, isLoading, refetch: refetchProduct } = useFetchData(`${urlConfig.ALL_PRODUCT_URL}/${productId}`);
  const { data: reviewsData, refetch: refetchReviews } = useFetchData(`${urlConfig.REVIEW_URL}/${productId}?limit=20`);

  if (isLoading && !data) return <Loader label="Loading product" />;
  if (error) {
    return (
      <main className="page empty-state">
        <h2>{error}</h2>
        <Link to="/">Back to the shop</Link>
      </main>
    );
  }

  const product = data?.data;
  if (!product) return null;
  const reviews = reviewsData?.data || [];
  const inStock = product.stock_quantity > 0;

  const buyNow = () => {
    if (!cart[product._id]) addToCart(product);
    navigate('/cart');
  };

  return (
    <main className="page">
      <nav className="breadcrumb muted">
        <Link to="/">Home</Link> /{' '}
        <Link to={`/products/${encodeURIComponent(product.categories[0])}`}>{capitalize(product.categories[0])}</Link>
      </nav>

      <section className="detail card">
        <div className="detail-gallery">
          <div className="detail-image">
            {/* key resets the image's error state when switching pictures */}
            <ProductImage key={imageIndex} src={product.productImages[imageIndex] || product.productImages[0]} alt={product.name} />
          </div>
          {product.productImages.length > 1 && (
            <div className="detail-thumbs">
              {product.productImages.map((src, index) => (
                <button
                  type="button"
                  key={src}
                  className={`detail-thumb ${index === imageIndex ? 'active' : ''}`}
                  onClick={() => setImageIndex(index)}
                  aria-label={`Show image ${index + 1}`}
                >
                  <ProductImage src={src} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="detail-info">
          <span className="product-brand">{product.brand}</span>
          <h1 className="detail-title">{product.name}</h1>
          {product.ratingCount > 0 ? (
            <StarRating value={product.averageRating} count={product.ratingCount} />
          ) : (
            <span className="muted">No reviews yet</span>
          )}
          <PriceTag price={product.price} discount={product.discount} finalPrice={product.finalPrice} large />
          <p className="muted detail-tax">Inclusive of all taxes</p>

          {inStock ? (
            <p className={product.stock_quantity < 5 ? 'detail-stock-low' : 'detail-stock'}>
              {product.stock_quantity < 5 ? `Only ${product.stock_quantity} left in stock` : 'In stock'}
            </p>
          ) : (
            <p className="detail-stock-out">Out of stock</p>
          )}

          <div className="detail-actions">
            <AddToCart product={product} />
            {inStock && (
              <button type="button" className="btn" onClick={buyNow}>Buy now</button>
            )}
          </div>

          <h2 className="detail-subtitle">About this item</h2>
          <p className="detail-description">{product.description}</p>
        </div>
      </section>

      <section className="reviews">
        <h2>Customer reviews</h2>
        {user ? (
          <ReviewForm
            productId={product._id}
            onAdded={() => {
              refetchReviews();
              refetchProduct();
            }}
          />
        ) : (
          <p className="muted">
            <Link to="/login" state={{ from: { pathname: `/product/${product._id}` } }}>Log in</Link> to review this product after buying it.
          </p>
        )}

        {reviews.length === 0 ? (
          <p className="muted">Be the first to review this product.</p>
        ) : (
          <ul className="review-list">
            {reviews.map((r) => (
              <li key={r._id} className="review card">
                <div className="row-between">
                  <strong>{r.user?.name || 'Customer'}</strong>
                  <span className="muted">{formatDate(r.createdAt)}</span>
                </div>
                <StarRating value={r.rating} />
                {/* React escapes text, so review content can't run as HTML */}
                <p>{r.review}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
};

export default ProductDetail;
