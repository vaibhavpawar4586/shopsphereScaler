import { Link, useNavigate } from 'react-router-dom';
import CartItem from '../../components/cartItem/CartItem';
import { useCart } from '../../context/cart/useCart';
import { FREE_SHIPPING_FROM, formatPrice, shippingFor } from '../../utils/format';
import './cartItems.css';

const CartItems = () => {
  const { items, subtotal, totalQuantity } = useCart();
  const navigate = useNavigate();
  const shipping = shippingFor(subtotal);

  if (items.length === 0) {
    return (
      <main className="page empty-state">
        <h2>Your cart is empty</h2>
        <p>Find something you like and add it to your cart.</p>
        <Link to="/" className="btn">Continue shopping</Link>
      </main>
    );
  }

  return (
    <main className="page">
      <h1 className="page-title">Your cart ({totalQuantity} item{totalQuantity === 1 ? '' : 's'})</h1>
      <div className="two-col">
        <section className="card">
          <ul className="cart-items">
            {items.map((item) => (
              <CartItem key={item._id} cartData={item} />
            ))}
          </ul>
        </section>

        <aside className="card cart-summary">
          <h2>Order summary</h2>
          <div className="summary-line">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="summary-line">
            <span>Shipping</span>
            <span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
          </div>
          {shipping > 0 && (
            <p className="cart-hint">Add {formatPrice(FREE_SHIPPING_FROM - subtotal)} more for free shipping.</p>
          )}
          <div className="summary-line summary-total">
            <span>Total</span>
            <span>{formatPrice(subtotal + shipping)}</span>
          </div>
          <button type="button" className="btn btn-block" onClick={() => navigate('/checkout')}>
            Proceed to checkout
          </button>
          <Link to="/" className="cart-continue">Continue shopping</Link>
        </aside>
      </div>
    </main>
  );
};

export default CartItems;
