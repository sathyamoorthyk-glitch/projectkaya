import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { errMsg } from '../api/client';
import { TERMS } from '../config';
import '../styles/Signauth.css';

export default function Signauth() {
  const { user, ready, login, signup, acceptTerms, logout } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState('signin');
  const [f, setF] = useState({ full_name: '', email: '', phone: '', password: '', confirm: '' });
  const [err, setErr] = useState('');
  const [emailNote, setEmailNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [ticked, setTicked] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  if (!ready) return <div className="kg-center-msg">Loading&hellip;</div>;
  if (user?.terms_accepted) return <Navigate to="/home" replace />;

  // Signed in but has not accepted the notice yet -> show the notice. Home opens only after the tick.
  if (user) {
    return (
      <section className="kg-auth container">
        <div className="kg-auth__panel kg-auth__notice">
          <h1>Before you start</h1>
          <p>Welcome, {user.full_name}. Please read and accept our delivery and billing notice.</p>
          <ul>{TERMS.map((t) => <li key={t}>{t}</li>)}</ul>
          <label className="kg-check">
            <input type="checkbox" checked={ticked} onChange={(e) => setTicked(e.target.checked)} /> I have read and accept this notice
          </label>
          {err && <div className="kg-flash is-error" role="alert">{err}</div>}
          <div className="d-flex gap-2 mt-3">
            <button className="kg-btn" disabled={!ticked || busy} onClick={async () => {
              setBusy(true);
              try { await acceptTerms(); nav('/home', { replace: true }); } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); }
            }}>Continue to home</button>
            <button className="kg-btn is-ghost" onClick={logout}>Sign out</button>
          </div>
        </div>
      </section>
    );
  }

  const checkEmail = async () => {
    if (mode !== 'signup' || !/\S+@\S+\.\S+/.test(f.email)) return;
    try {
      const r = await api.post('/users/check-email/', { email: f.email });
      setEmailNote(r.data.exists ? 'This email already has an account. Please sign in.' : '');
    } catch { /* ignore */ }
  };

  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (mode === 'signup') {
      if (f.password !== f.confirm) return setErr('Passwords do not match.');
      if (!/^[6-9]\d{9}$/.test(f.phone)) return setErr('Enter a valid 10-digit mobile number.');
    }
    setBusy(true);
    try {
      if (mode === 'signin') await login(f.email, f.password);
      else await signup({ full_name: f.full_name, email: f.email, phone: f.phone, password: f.password });
    } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  };

  return (
    <section className="kg-auth container">
      <div className="row g-5 align-items-center">
        <div className="col-lg-6">
          <h1 className="kg-auth__headline">Your neighbourhood stores, one account.</h1>
          <p className="kg-auth__lead">Sign in to browse rice, oil, pulses and more from our partner supermarkets, pay securely, and get your bill by email.</p>
        </div>
        <div className="col-lg-5 offset-lg-1">
          <div className="kg-auth__panel">
            <div className="kg-tabs" role="tablist">
              <button role="tab" aria-selected={mode === 'signin'} className={mode === 'signin' ? 'is-on' : ''} onClick={() => { setMode('signin'); setErr(''); }}>Sign in</button>
              <button role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'is-on' : ''} onClick={() => { setMode('signup'); setErr(''); }}>Create account</button>
            </div>
            <form className="kg-form" onSubmit={submit} noValidate>
              {mode === 'signup' && (<>
                <label>Full name</label>
                <input className="form-control" required value={f.full_name} onChange={set('full_name')} autoComplete="name" />
                <label>Mobile number</label>
                <input className="form-control" required inputMode="numeric" maxLength={10} value={f.phone} onChange={set('phone')} autoComplete="tel-national" />
              </>)}
              <label>Email (your user id)</label>
              <input className="form-control" type="email" required value={f.email} onChange={set('email')} onBlur={checkEmail} autoComplete="email" />
              {emailNote && <p className="kg-hint is-warn">{emailNote}</p>}
              <label>Password</label>
              <input className="form-control" type="password" required minLength={8} value={f.password} onChange={set('password')} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />
              {mode === 'signup' && (<>
                <label>Confirm password</label>
                <input className="form-control" type="password" required value={f.confirm} onChange={set('confirm')} autoComplete="new-password" />
              </>)}
              {err && <div className="kg-flash is-error" role="alert">{err}</div>}
              <button className="kg-btn w-100 mt-3" disabled={busy}>{busy ? 'Please wait\u2026' : mode === 'signin' ? 'Sign in' : 'Create account'}</button>
              {mode === 'signin' && (
                <p className="kg-auth__links"><Link to="/forgot-userid">Forgot user id?</Link><Link to="/forgot-password">Forgot password?</Link></p>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
