import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from '../components/header/Header';
import Footer from '../components/footer/Footer';
import RequireAuth from '../components/requireAuth/RequireAuth';
import useFetchData from '../hooks/useFetchData';
import urlConfig from '../utils/urlConfig';

import ProductListing from '../pages/productListing/ProductListing';
import ProductDetail from '../pages/productDetail/ProductDetail';
import CartItems from '../pages/cartItems/CartItems';
import Checkout from '../pages/checkout/Checkout';
import Orders from '../pages/orders/Orders';
import OrderDetail from '../pages/orders/OrderDetail';
import Login from '../pages/login/Login';
import Signup from '../pages/signup/Signup';
import ForgotPassword from '../pages/forgotPassword/ForgotPassword';
import ResetPassword from '../pages/forgotPassword/ResetPassword';
import NotFound from '../pages/notFound/NotFound';
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminProducts from '../pages/admin/AdminProducts';
import ProductForm from '../pages/admin/ProductForm';
import AdminOrders from '../pages/admin/AdminOrders';

const AppRoutes = () => {
  const { data: categories, isLoading } = useFetchData(urlConfig.CATEGORIES_URL, { data: [] });

  return (
    <Router>
      <Header categories={categories?.data || []} isLoading={isLoading} />
      <Routes>
        {/* Public */}
        <Route path="/" element={<ProductListing />} />
        <Route path="/products/:categoryName" element={<ProductListing />} />
        <Route path="/product/:productId" element={<ProductDetail />} />
        <Route path="/cart" element={<CartItems />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Logged-in customers */}
        <Route element={<RequireAuth />}>
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:bookingId" element={<OrderDetail />} />
        </Route>

        {/* Admins and sellers */}
        <Route element={<RequireAuth roles={['admin', 'seller']} />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/products" element={<AdminProducts />} />
          <Route path="/admin/products/new" element={<ProductForm />} />
          <Route path="/admin/products/:productId/edit" element={<ProductForm />} />
        </Route>
        <Route element={<RequireAuth roles={['admin']} />}>
          <Route path="/admin/orders" element={<AdminOrders />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
    </Router>
  );
};

export default AppRoutes;
