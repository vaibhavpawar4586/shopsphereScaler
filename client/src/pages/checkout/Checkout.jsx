import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/cart/useCart';
import useAuth from '../../context/auth/useAuth';
import usePayment from '../../hooks/usePayment';
import useFetchData from '../../hooks/useFetchData';
import api, { getErrorMessage } from '../../utils/api';
import urlConfig from '../../utils/urlConfig';
import { formatPrice, shippingFor } from '../../utils/format';
import './checkout.css';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Lakshadweep',
];

const ADDRESS_KEY = 'shopsphere_address';

function loadSavedAddress(name) {
  try {
    return { fullName: name, phone: '', line1: '', line2: '', city: '', state: '', pincode: '', ...JSON.parse(localStorage.getItem(ADDRESS_KEY)) };
  } catch {
    return { fullName: name, phone: '', line1: '', line2: '', city: '', state: '', pincode: '' };
  }
}

const Checkout = () => {
  const cartState = useCart();
  const { clearCart } = cartState;
  // Once the order is placed the cart is emptied, so keep showing what was ordered.
  const [snapshot, setSnapshot] = useState(null);
  const { items, subtotal } = snapshot || cartState;
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pay, paymentUI } = usePayment();
  const { data: configData } = useFetchData(urlConfig.PAYMENT_CONFIG_URL);
  const paymentMode = configData?.data?.mode;

  const [address, setAddress] = useState(() => loadSavedAddress(user?.name || ''));
  const [error, setError] = useState('');
  const [placing, setPlacing] = useState(false);

  if (items.length === 0) return <Navigate to="/cart" replace />;

  const shipping = shippingFor(subtotal);
  const update = (field) => (event) => setAddress((current) => ({ ...current, [field]: event.target.value }));

  const placeOrder = async (event) => {
    event.preventDefault();
    setError('');
    setPlacing(true);
    try {
      // Only product ids and quantities are sent - the server looks up the prices.
      const res = await api.post(urlConfig.BOOKING_URL, {
        items: items.map((item) => ({ productId: item._id, quantity: item.quantity })),
        shippingAddress: address,
      });
      try {
        localStorage.setItem(ADDRESS_KEY, JSON.stringify(address));
      } catch {
        // ignore storage errors
      }

      // The order now exists on the server and the stock is held, so the cart can be emptied.
      // If the customer closes the payment window they can pay later from the order page.
      setSnapshot({ items, subtotal });
      clearCart();
      const { booking, payment } = res.data.data;
      let result = { status: 'dismissed' };
      try {
        result = await pay({ booking, payment });
      } catch (payError) {
        navigate(`/orders/${booking._id}`, { state: { paymentError: getErrorMessage(payError) } });
        return;
      }
      navigate(`/orders/${booking._id}`, { state: { justPlaced: true, paymentResult: result.status } });
    } catch (err) {
      setError(getErrorMessage(err));
      setPlacing(false);
    }
  };

  return (
    <main className="page">
      <h1 className="page-title">Checkout</h1>
      <form className="two-col" onSubmit={placeOrder}>
        <section className="card">
          <h2 className="checkout-heading">Shipping address</h2>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="fullName">Full name</label>
              <input id="fullName" value={address.fullName} onChange={update('fullName')} required maxLength={80} autoComplete="name" />
            </div>
            <div className="field">
              <label htmlFor="phone">Mobile number</label>
              <input
                id="phone"
                value={address.phone}
                onChange={update('phone')}
                required
                inputMode="numeric"
                pattern="[6-9][0-9]{9}"
                title="10 digit Indian mobile number"
                maxLength={10}
                autoComplete="tel-national"
              />
            </div>
            <div className="field field-full">
              <label htmlFor="line1">Address line 1</label>
              <input id="line1" value={address.line1} onChange={update('line1')} required maxLength={120} placeholder="House no., building, street" autoComplete="address-line1" />
            </div>
            <div className="field field-full">
              <label htmlFor="line2">Address line 2 <span className="muted">(optional)</span></label>
              <input id="line2" value={address.line2} onChange={update('line2')} maxLength={120} placeholder="Area, landmark" autoComplete="address-line2" />
            </div>
            <div className="field">
              <label htmlFor="city">City</label>
              <input id="city" value={address.city} onChange={update('city')} required maxLength={60} autoComplete="address-level2" />
            </div>
            <div className="field">
              <label htmlFor="state">State</label>
              <select id="state" value={address.state} onChange={update('state')} required>
                <option value="">Select state</option>
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="pincode">Pincode</label>
              <input
                id="pincode"
                value={address.pincode}
                onChange={update('pincode')}
                required
                inputMode="numeric"
                pattern="[1-9][0-9]{5}"
                title="6 digit pincode"
                maxLength={6}
                autoComplete="postal-code"
              />
            </div>
          </div>
        </section>

        <aside className="card checkout-summary">
          <h2 className="checkout-heading">Your order</h2>
          <ul className="checkout-items">
            {items.map((item) => (
              <li key={item._id}>
                <span className="checkout-item-name">{item.name} × {item.quantity}</span>
                <span>{formatPrice(item.finalPrice * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="summary-line"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
          <div className="summary-line"><span>Shipping</span><span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span></div>
          <div className="summary-line summary-total"><span>Total</span><span>{formatPrice(subtotal + shipping)}</span></div>

          {error && <div className="alert alert-error">{error}</div>}
          {paymentMode === 'mock' && (
            <div className="alert alert-warning">Test mode: payments are simulated, no money is charged.</div>
          )}

          <button type="submit" className="btn btn-block" disabled={placing}>
            {placing ? 'Processing…' : `Place order & pay ${formatPrice(subtotal + shipping)}`}
          </button>
          <p className="checkout-secure muted">
            You&apos;ll pay securely on Razorpay (cards, UPI, net banking, wallets). Your card details never reach our servers.
          </p>
          <Link to="/cart" className="cart-continue">Back to cart</Link>
        </aside>
      </form>
      {paymentUI}
    </main>
  );
};

export default Checkout;
