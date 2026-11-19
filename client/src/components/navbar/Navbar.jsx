import { memo, useEffect, useState } from 'react';
import { Link, NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { FaOpencart, FaSearch, FaUserCircle } from 'react-icons/fa';
import { useCart } from '../../context/cart/useCart';
import useAuth from '../../context/auth/useAuth';
import { capitalize } from '../../utils/format';
import './navbar.css';

const Navbar = ({ categories = [], isLoading }) => {
  const { totalQuantity } = useCart();
  const { user, canManageProducts, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [menuOpen, setMenuOpen] = useState(false);

  // Keep the box in sync when the URL changes (e.g. clicking a category clears the search).
  useEffect(() => {
    setSearch(searchParams.get('q') || '');
  }, [searchParams]);

  const onSearch = (event) => {
    event.preventDefault();
    const q = search.trim();
    navigate(q ? `/?q=${encodeURIComponent(q)}` : '/');
  };

  const onLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/');
  };

  return (
    <nav className="nav">
      <div className="nav-top">
        <Link to="/" className="nav-logo">
          <FaOpencart aria-hidden="true" /> ShopSphere
        </Link>

        <form className="nav-search" onSubmit={onSearch} role="search">
          <input
            type="search"
            placeholder="Search products, brands..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search products"
          />
          <button type="submit" aria-label="Search">
            <FaSearch />
          </button>
        </form>

        <div className="nav-right">
          {user ? (
            <div className="nav-user">
              <button type="button" className="nav-user-btn" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen}>
                <FaUserCircle aria-hidden="true" />
                <span className="nav-user-name">{user.name.split(' ')[0]}</span>
              </button>
              {menuOpen && (
                <div className="nav-menu" onMouseLeave={() => setMenuOpen(false)}>
                  <Link to="/orders" onClick={() => setMenuOpen(false)}>My orders</Link>
                  {canManageProducts && (
                    <Link to="/admin" onClick={() => setMenuOpen(false)}>
                      {user.role === 'admin' ? 'Admin dashboard' : 'Seller dashboard'}
                    </Link>
                  )}
                  <button type="button" onClick={onLogout}>Log out</button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="nav-login">Log in</Link>
          )}

          <Link to="/cart" className="cart-icon-container" aria-label={`Cart, ${totalQuantity} items`}>
            <FaOpencart className="cart-icon" />
            {totalQuantity > 0 && <span className="cart-badge">{totalQuantity}</span>}
          </Link>
        </div>
      </div>

      <ul className="nav-items">
        <li className="nav-item">
          <NavLink to="/" end className="nav-link">All</NavLink>
        </li>
        {!isLoading &&
          categories.map((item) => (
            <li className="nav-item" key={item}>
              <NavLink to={`/products/${encodeURIComponent(item)}`} className="nav-link">
                {capitalize(item)}
              </NavLink>
            </li>
          ))}
      </ul>
    </nav>
  );
};

export default memo(Navbar);
