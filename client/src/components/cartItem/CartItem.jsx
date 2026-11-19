import { Link } from 'react-router-dom';
import { FaTrashAlt } from 'react-icons/fa';
import { useCart } from '../../context/cart/useCart';
import ProductImage from '../productImage/ProductImage';
import { formatPrice } from '../../utils/format';
import './cartItem.css';

const CartItem = ({ cartData }) => {
  const { addToCart, removeFromCart, deleteFromCart, maxFor } = useCart();
  const { _id, name, brand, image, finalPrice, quantity } = cartData;
  const atMax = quantity >= maxFor(cartData);

  return (
    <li className="cart-item">
      <Link to={`/product/${_id}`} className="cart-item-image">
        <ProductImage src={image} alt={name} />
      </Link>
      <div className="cart-item-info">
        <span className="cart-item-brand">{brand}</span>
        <Link to={`/product/${_id}`} className="cart-item-name">{name}</Link>
        <span className="cart-item-price">{formatPrice(finalPrice)} each</span>
      </div>
      <div className="qty-control">
        <button type="button" onClick={() => removeFromCart(_id)} aria-label={`Remove one ${name}`}>−</button>
        <span className="quantity">{quantity}</span>
        <button type="button" onClick={() => addToCart(cartData)} disabled={atMax} aria-label={`Add one more ${name}`}>+</button>
      </div>
      <div className="cart-item-total">{formatPrice(finalPrice * quantity)}</div>
      <button type="button" className="cart-item-delete" onClick={() => deleteFromCart(_id)} aria-label={`Remove ${name} from cart`}>
        <FaTrashAlt />
      </button>
    </li>
  );
};

export default CartItem;
