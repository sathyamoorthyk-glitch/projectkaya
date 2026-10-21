import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api/client';
import '../styles/ForgotPages.css';

export default function ForgetPassword() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setMsg(''); setBusy(true);
    try { setMsg((await api.post('/users/password-reset/request/', { email })).data.detail); } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  };

  return (
    <section className="kg-forgot container">
      <h1>Forgot password</h1>
      <p>Enter the email you signed up with. If it matches an account, we will email you a link to set a new password.</p>
      <form className="kg-form" onSubmit={submit}>
        <label>Email</label>
        <input className="form-control" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        {err && <div className="kg-flash is-error" role="alert">{err}</div>}
        {msg && <div className="kg-flash is-ok" role="status">{msg}</div>}
        <button className="kg-btn mt-3" disabled={busy}>{busy ? 'Sending\u2026' : 'Send reset link'}</button>
      </form>
      <p className="kg-hint"><Link to="/">Back to sign in</Link></p>
    </section>
  );
}
