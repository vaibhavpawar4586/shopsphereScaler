import { NavLink } from 'react-router-dom';
import useAuth from '../../context/auth/useAuth';
import './admin.css';

const AdminNav = () => {
  const { isAdmin } = useAuth();
  return (
    <nav className="admin-nav">
      <NavLink to="/admin" end>Dashboard</NavLink>
      <NavLink to="/admin/products">Products</NavLink>
      {isAdmin && <NavLink to="/admin/orders">Orders</NavLink>}
    </nav>
  );
};

export default AdminNav;
