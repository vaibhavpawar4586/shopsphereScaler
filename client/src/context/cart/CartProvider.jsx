import { useCallback, useEffect, useMemo, useState } from 'react';
import CartContext from './CartContext';

const STORAGE_KEY = 'shopsphere_cart';
const MAX_PER_ITEM = 10;

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved && typeof saved === 'object' ? saved : {};
  } catch {
    return {};
  }
}

/** Only the fields the cart needs are kept, so localStorage stays small. */
const toCartItem = (product, quantity) => ({
  _id: product._id,
  name: product.name,
  brand: product.brand,
  image: product.productImages?.[0] || product.image || '',
  price: product.price,
  finalPrice: product.finalPrice,
  stock_quantity: product.stock_quantity,
  quantity,
});

const maxFor = (item) => Math.max(0, Math.min(MAX_PER_ITEM, item.stock_quantity ?? MAX_PER_ITEM));

/**
 * Cart state: an object keyed by product id (as in the course), saved to localStorage
 * so it survives a page refresh. Prices here are only for display - the server
 * recalculates everything at checkout.
 */
const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(loadCart);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Storage full or blocked (private mode): the cart still works for this visit.
    }
  }, [cart]);

  const addToCart = useCallback((product, quantity = 1) => {
    setCart((current) => {
      const existing = current[product._id];
      const item = toCartItem(product, existing ? existing.quantity : 0);
      const nextQty = Math.min(item.quantity + quantity, maxFor(item));
      if (nextQty <= 0) return current;
      return { ...current, [product._id]: { ...item, quantity: nextQty } };
    });
  }, []);

  // Decrease by one (removes the item at zero), like the course's removeFromCart.
  const removeFromCart = useCallback((productId) => {
    setCart((current) => {
      const existing = current[productId];
      if (!existing) return current;
      const updated = { ...current };
      if (existing.quantity <= 1) delete updated[productId];
      else updated[productId] = { ...existing, quantity: existing.quantity - 1 };
      return updated;
    });
  }, []);

  const deleteFromCart = useCallback((productId) => {
    setCart((current) => {
      const updated = { ...current };
      delete updated[productId];
      return updated;
    });
  }, []);

  const clearCart = useCallback(() => setCart({}), []);

  const value = useMemo(() => {
    const items = Object.values(cart);
    return {
      cart,
      items,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: Math.round(items.reduce((sum, item) => sum + item.finalPrice * item.quantity, 0) * 100) / 100,
      maxFor,
      addToCart,
      removeFromCart,
      deleteFromCart,
      clearCart,
    };
  }, [cart, addToCart, removeFromCart, deleteFromCart, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export default CartProvider;
