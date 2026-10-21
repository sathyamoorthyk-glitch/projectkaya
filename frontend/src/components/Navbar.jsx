import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import Wordmark from './Wordmark';
import SearchBar from './SearchBar';
import '../styles/Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const signedIn = user?.terms_accepted;
  const displayName =
  user?.first_name || user?.name || user?.username || user?.email?.split('@')[0] || '';
  const close = () => setOpen(false);

  return (
    <header className="kg-nav">
      <nav className="navbar navbar-expand-lg container">
        <Wordmark to={signedIn ? '/home' : '/'} light />
        <button className="navbar-toggler kg-nav__toggle" type="button" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
          <i className={`bi ${open ? 'bi-x-lg' : 'bi-list'}`} />
        </button>
        <div className={`collapse navbar-collapse ${open ? 'show' : ''}`}>
          <ul className="navbar-nav kg-nav__links me-auto">
            {signedIn && <li><NavLink to="/home" onClick={close}>Home</NavLink></li>}
            {signedIn && <li><NavLink to="/products" onClick={close}>Products</NavLink></li>}
            <li><NavLink to="/about" onClick={close}>About us</NavLink></li>
            <li><NavLink to="/contact" onClick={close}>Contact us</NavLink></li>
          </ul>
          {signedIn && <SearchBar />}
          <div className="kg-nav__actions">
            {signedIn ? (
              <>
    <Link to="/cart" onClick={close} className="kg-nav__icon" aria-label={`Cart, ${count} items`}>
      <i className="bi bi-bag" />{count > 0 && <b>{count}</b>}
    </Link>
    <Link to="/dashboard" onClick={close} className="kg-nav__icon" aria-label="My account">
      <i className="bi bi-person" />
    </Link>
    <span className="kg-nav__username" title={displayName}>{displayName}</span>
    <span className="kg-nav__divider" aria-hidden="true" />
    <button className="kg-nav__text" onClick={async () => { close(); await logout(); nav('/'); }}>Sign out</button>
  </>
) : (
  <Link to="/" onClick={close} className="kg-nav__text">Sign in</Link>
)}
          </div>
        </div>
      </nav>
    </header>
  );
}
