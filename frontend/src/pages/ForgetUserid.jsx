import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api/client';
import '../styles/ForgotPages.css';

// Your user id is your email. This page checks whether an account exists for it.
export default function ForgetUserid() {
  const [email, setEmail] = useState('');
  const [res, setRes] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setRes(null); setBusy(true);
    try { setRes((await api.post('/users/check-email/', { email })).data.exists); } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  };

  return (
    <section className="kg-forgot container">
      <h1>Forgot user id</h1>
      <p>Your user id is the email you signed up with. Enter an email to check whether it has an account.</p>
      <form className="kg-form" onSubmit={submit}>
        <label>Email</label>
        <input className="form-control" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        {err && <div className="kg-flash is-error" role="alert">{err}</div>}
        <button className="kg-btn mt-3" disabled={busy}>{busy ? 'Checking\u2026' : 'Check email'}</button>
      </form>
      {res === true && <div className="kg-flash is-ok" role="status">Yes, <b>{email}</b> is registered. Use it as your user id to <Link to="/">sign in</Link>, or <Link to="/forgot-password">reset your password</Link>.</div>}
      {res === false && <div className="kg-flash is-error" role="status">No account uses <b>{email}</b>. Check the spelling, or <Link to="/">create a new account</Link>.</div>}
    </section>
  );
}
