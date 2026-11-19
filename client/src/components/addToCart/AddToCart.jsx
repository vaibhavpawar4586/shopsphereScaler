import { useCart } from '../../context/cart/useCart';
import './addToCart.css';

const AddToCart = ({ product }) => {
  const { cart, addToCart, removeFromCart, maxFor } = useCart();
  const itemInCart = cart[product._id];
  const quantity = itemInCart ? itemInCart.quantity : 0;
  const outOfStock = product.stock_quantity === 0;
  const atMax = itemInCart && quantity >= maxFor({ stock_quantity: product.stock_quantity });

  if (outOfStock && !itemInCart) {
    return <span className="add-to-cart-out">Out of stock</span>;
  }

  return (
    <div className="add-to-cart">
      {itemInCart ? (
        <div className="qty-control">
          <button type="button" onClick={() => removeFromCart(product._id)} aria-label={`Remove one ${product.name}`}>
            −
          </button>
          <span className="quantity" aria-live="polite">{quantity}</span>
          <button type="button" onClick={() => addToCart(product)} disabled={atMax} aria-label={`Add one more ${product.name}`}>
            +
          </button>
        </div>
      ) : (
        <button type="button" className="btn btn-sm" onClick={() => addToCart(product)}>
          Add to cart
        </button>
      )}
    </div>
  );
};

export default AddToCart;
