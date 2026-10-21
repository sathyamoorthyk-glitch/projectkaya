import { Link } from 'react-router-dom';
import { SHOP } from '../config';
import { useAuth } from '../context/AuthContext';
import Wordmark from './Wordmark';
import '../styles/Footer.css';

const SOCIAL = [['facebook', 'bi-facebook'], ['instagram', 'bi-instagram'], ['x', 'bi-twitter-x'], ['youtube', 'bi-youtube'], ['whatsapp', 'bi-whatsapp']];

export default function Footer() {
  const { user } = useAuth();
  const signedIn = user?.terms_accepted;
  return (
    <footer className="kg-footer">
      <div className="container">
        <div className="row g-5">
          <div className="col-lg-5">
            <Wordmark to={signedIn ? '/home' : '/'} light />
            <p className="kg-footer__blurb">{SHOP.tagline}</p>
            <div className="kg-footer__social">
              {SOCIAL.map(([k, icon]) => (
                <a key={k} href={SHOP.social[k]} target="_blank" rel="noreferrer" aria-label={k}><i className={`bi ${icon}`} /></a>
              ))}
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <h4>Quick links</h4>
            <ul>
              {signedIn && <li><Link to="/home">Home</Link></li>}
              {signedIn && <li><Link to="/products">Products</Link></li>}
              {signedIn && <li><Link to="/dashboard">My account</Link></li>}
              <li><Link to="/about">About us</Link></li>
              <li><Link to="/contact">Contact us</Link></li>
            </ul>
          </div>
          <div className="col-6 col-lg-4">
            <h4>Visit us</h4>
            <ul>
              <li>{SHOP.address}</li>
              <li><a href={`tel:${SHOP.phone.replace(/\s/g, '')}`}>{SHOP.phone}</a></li>
              <li><a href={`mailto:${SHOP.email}`}>{SHOP.email}</a></li>
              <li>{SHOP.hours}</li>
            </ul>
          </div>
        </div>
        <p className="kg-footer__legal">&copy; {new Date().getFullYear()} {SHOP.name}. All prices include GST.</p>
      </div>
    </footer>
  );
}
