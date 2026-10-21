import { SHOP } from '../config';
import '../styles/AboutUs.css';

export default function AboutUs() {
  const map = `https://www.google.com/maps?q=${encodeURIComponent(SHOP.mapQuery)}&output=embed`;
  return (
    <section className="container kg-page kg-about">
      <h1>About {SHOP.name}</h1>
      <div className="row g-5">
        <div className="col-lg-6">
          {/* Replace this copy with your own story */}
          <p>{SHOP.name} brings the supermarkets in your neighbourhood onto one app. Choose rice, oil, pulses and everyday essentials, pay securely online, and receive a proper GST bill for every order.</p>
          <p>Each store packs and delivers its own orders, so what you get is as fresh as the shelf it came from.</p>
          <dl className="kg-facts">
            <div><dt>Address</dt><dd>{SHOP.address}</dd></div>
            <div><dt>Phone</dt><dd>{SHOP.phone}</dd></div>
            <div><dt>Email</dt><dd>{SHOP.email}</dd></div>
            <div><dt>Hours</dt><dd>{SHOP.hours}</dd></div>
            <div><dt>Delivery</dt><dd>Free within {SHOP.deliveryRadiusKm} km</dd></div>
          </dl>
        </div>
        <div className="col-lg-6">
          <div className="kg-map"><iframe title="Store location on Google Maps" src={map} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen /></div>
        </div>
      </div>
    </section>
  );
}
