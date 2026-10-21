# MyKayaGlobal

One project, two folders:

```
myKayaGlobal/
├── django-backend/         Django + PostgreSQL (the only backend)
│   ├── backend/            settings.py, urls.py
│   ├── users/              signup, signin, email check, password reset, change email, 3 addresses
│   ├── catalog/            stores, categories, products, brand/size variants, search, JSON sync
│   ├── orders/             checkout, Razorpay, GST split, bill + packing list PDFs, bill log, emails
│   └── core/               states list, mailer, contact form
└── frontend/               React (Vite) + Bootstrap
    ├── public/images/      put product/category photos here (e.g. rice.jpg)
    ├── scripts/            syncCatalog.mjs
    └── src/
        ├── data/ProductData.json    <- the file you edit to add/change products
        ├── pages/  components/  context/  api/  utils/  styles/
        └── config.js                <- shop name, address, phone, social links, notice text
```

## Run it (Windows)

Use a **new** PostgreSQL database. The user table changed (email sign-in), so the old `django-backend` database cannot be reused.

```
:: 1. Database (once)
psql -U postgres -c "CREATE DATABASE mykayaglobal;"

:: 2. Backend
cd myKayaGlobal\django-backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env          (then fill in DB_PASSWORD, SECRET_KEY, Razorpay keys, email)
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py sync_catalog   (loads ProductData.json; add --watch to re-sync on every save)
python manage.py runserver

:: 3. Frontend (second terminal)
cd myKayaGlobal\frontend
copy .env.example .env
npm install
npm run dev                     (opens http://localhost:5173)
```

Admin panel: http://127.0.0.1:8000/admin/ (products, stores, orders, bill log, contact messages).
No SMTP yet? Leave `EMAIL_BACKEND` as the console one and emails print in the backend terminal.

## How your requirements map to the code

| Your document | Where it is now |
|---|---|
| Signauth.jsx (sign up/in, acceptance notice before Home) | `pages/Signauth.jsx`, `components/ProtectedRoute.jsx`, `users/` (stores `terms_accepted_at`) |
| ForgetUserid.jsx (check email exists) | `pages/ForgetUserid.jsx` -> `POST /api/users/check-email/` |
| ForgetPassword.jsx (match email, send reset) | `pages/ForgetPassword.jsx` -> emailed reset link |
| Reset.jsx (reset password, change email in DB) | `pages/Reset.jsx` (3 modes: from email link, change password, change email) |
| Home.jsx + navbar + Footer.jsx on every page | `App.jsx` Layout wraps all pages with `components/Navbar.jsx` + `components/Footer.jsx` |
| Product.jsx (title, image, link) | `pages/Product.jsx` |
| Product(more_btn).jsx | `pages/ProductMore.jsx` (one page for every category via `/category/:slug`) |
| ProductData.jsx (brand, kgs scrollbars, price, discount, GST/IGST, add to cart / buy) | `components/ProductData.jsx` (one card for all 300+ products) |
| ProductData.json -> backend automatically | `frontend/src/data/ProductData.json` -> `manage.py sync_catalog --watch` or `npm run sync:watch` |
| GST / IGST per product id by customer state | product `gst_rate` + `hsn`; `orders/tax.py` (server), `utils/tax.js` (display) |
| 3 saved addresses, flash after 3 | `users/models.py` limit + message in `AddressForm`, Checkout, Dashboard |
| Details confirmation before payment | `pages/Checkout.jsx` step 2 |
| razorpayCheckout.js, keys not exposed | `utils/razorpayCheckout.js` (public key id only); secret stays in backend `.env` |
| PaymentSuccess: ref id, confirmation no, 2 PDFs to customer + shop owner | `orders/services.py`, `orders/pdf.py`, `pages/PaymentSuccess.jsx` |
| Bill stored in separate log | `BillLog` table (admin: "Bill logs") + PDFs in `media/invoices/` |
| AboutUs with Google Map, ContactUs with auto reply | `pages/AboutUs.jsx`, `pages/ContactUs.jsx`, `core/views.py` |
| SearchBar | `components/SearchBar.jsx` + `pages/Search.jsx` |
| Express: Controller/Routes/Utils/store/mailer/tax/invoicePdf/states | Folded into Django: `views.py`, `urls.py`, `core/mailer.py`, `catalog/models.py (Store)`, `orders/tax.py`, `orders/pdf.py`, `core/states.py` |

## Changes I made to your plan (and why)

1. **One backend, not two.** Express and Django would both need the same database and the same secret keys. Everything is now Django, so Razorpay secret, PDFs and email live in one place.
2. **Renamed files** that had brackets or typos: `Product(more_btn).jsx` -> `ProductMore.jsx`, `PaymentSucess` -> `Checkout.jsx` (before paying) + `PaymentSuccess.jsx` (after paying). `ProductData.jsx` and `Footer.jsx` moved to `components/` because they are reused.
3. **Brand is part of the product page, not a separate product.** "Basmati Rice" is one product; India Gate / Daawat and 0.25 kg ... 10 kg are its variants. Each store sets its own price and stock per variant.
4. **Prices are GST-inclusive.** Tax is split out of the price: same state as the store -> CGST + SGST, other state -> IGST.
5. **One order per store.** If a cart has items from two shops, the customer pays once, but each shop gets its own order, bill and packing list.
6. Added `Cart.jsx` and `Dashboard.jsx` (orders, addresses, profile). Your document did not describe a Dashboard, so I assumed this.

## Things you must fill in before going live

- `frontend/src/config.js`: real address, phone, email, social links, notice text (only the "free delivery within 15 km" line came from you).
- `ProductData.json`: the sample products, prices, GSTIN, HSN codes and GST rates are **placeholders**. Confirm HSN/GST rates with your accountant.
- Razorpay test keys in `django-backend/.env`. Add a webhook in the Razorpay dashboard pointing to `/api/orders/razorpay/webhook/` with the same secret as `RAZORPAY_WEBHOOK_SECRET`.
- Product photos in `frontend/public/images/` (until then a placeholder is shown).

## Not built yet

- The 15 km free-delivery check (needs a distance/pincode rule) and delivery charges.
- Paying each store owner their share (Razorpay Route) and refunds/cancellations.
- Emails are sent inside the request; for many orders move this to a background worker.
