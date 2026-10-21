import { Link } from 'react-router-dom';

// "KAYA" and "GLOBAL" as one spaced lettermark. Change the look in styles/Navbar.css (.kg-wordmark).
export default function Wordmark({ to = '/', light = false, size = '' }) {
  return (
    <Link to={to} className={`kg-wordmark ${light ? 'is-light' : ''} ${size}`} aria-label="Kaya Global home">
      <span className="kg-wordmark__kaya">Kaya</span>
      <span className="kg-wordmark__global">Global</span>
    </Link>
  );
}
