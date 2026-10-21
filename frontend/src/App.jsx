import { Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Signauth from './pages/Signauth';
import ForgetUserid from './pages/ForgetUserid';
import ForgetPassword from './pages/ForgetPassword';
import Reset from './pages/Reset';
import Home from './pages/Home';
import Product from './pages/Product';
import ProductMore from './pages/ProductMore';
import Search from './pages/Search';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import PaymentSuccess from './pages/PaymentSuccess';
import Dashboard from './pages/Dashboard';
import AboutUs from './pages/AboutUs';
import ContactUs from './pages/ContactUs';

// Navbar + Footer wrap every page, as required.
function Layout() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return (
    <div className="kg-shell">
      <Navbar />
      <main><Outlet /></main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* public */}
        <Route path="/" element={<Signauth />} />
        <Route path="/forgot-userid" element={<ForgetUserid />} />
        <Route path="/forgot-password" element={<ForgetPassword />} />
        <Route path="/reset" element={<Reset />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/navbar" element={<Navbar />} />
        {/* only after sign-in + accepting the notice */}
        <Route element={<ProtectedRoute />}>
          <Route path="/home" element={<Home />} />
          <Route path="/products" element={<Product />} />
          <Route path="/category/:slug" element={<ProductMore />} />
          <Route path="/search" element={<Search />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/payment-success/:rzOrderId" element={<PaymentSuccess />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>
        <Route path="*" element={<div className="kg-center-msg">Page not found.</div>} />
      </Route>
    </Routes>
  );
}
