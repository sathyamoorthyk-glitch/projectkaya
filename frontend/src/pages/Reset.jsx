import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api, { errMsg, setToken } from '../api/client';
import { useAuth } from '../context/AuthContext';
import '../styles/ForgotPages.css';

function useAction() {
  const [state, setState] = useState({ msg: '', err: '', busy: false });
  const run = async (fn, okMsg) => {
    setState({ msg: '', err: '', busy: true });
    try { await fn(); setState({ msg: okMsg, err: '', busy: false }); return true; }
    catch (x) { setState({ msg: '', err: errMsg(x), busy: false }); return false; }
  };
  return [state, run];
}

const Flash = ({ s }) => (<>
  {s.err && <div className="kg-flash is-error" role="alert">{s.err}</div>}
  {s.msg && <div className="kg-flash is-ok" role="status">{s.msg}</div>}
</>);

export default function Reset() {
  const [params] = useSearchParams();
  const { user, setUser } = useAuth();
  const nav = useNavigate();
  const uid = params.get('uid'), token = params.get('token');
  const [pw, setPw] = useState({ a: '', b: '' });
  const [cp, setCp] = useState({ current: '', next: '', again: '' });
  const [em, setEm] = useState({ email: '', current: '' });
  const [s1, run1] = useAction(); const [s2, run2] = useAction(); const [s3, run3] = useAction();

  // A) opened from the email link
  if (uid && token) {
    return (
      <section className="kg-forgot container">
        <h1>Set a new password</h1>
        <form className="kg-form" onSubmit={async (e) => {
          e.preventDefault();
          if (pw.a !== pw.b) return run1(async () => { throw new Error('Passwords do not match.'); });
          const ok = await run1(() => api.post('/users/password-reset/confirm/', { uid, token, new_password: pw.a }), 'Password updated. Taking you to sign in\u2026');
          if (ok) setTimeout(() => nav('/'), 1500);
        }}>
          <label>New password</label>
          <input className="form-control" type="password" minLength={8} required value={pw.a} onChange={(e) => setPw({ ...pw, a: e.target.value })} autoComplete="new-password" />
          <label>Confirm new password</label>
          <input className="form-control" type="password" required value={pw.b} onChange={(e) => setPw({ ...pw, b: e.target.value })} autoComplete="new-password" />
          <Flash s={s1} />
          <button className="kg-btn mt-3" disabled={s1.busy}>Update password</button>
        </form>
      </section>
    );
  }

  // B) not signed in and no link
  if (!user) {
    return (
      <section className="kg-forgot container">
        <h1>Reset password</h1>
        <p>To reset a forgotten password, <Link to="/forgot-password">request a reset link</Link>. To change your password or email, <Link to="/">sign in</Link> first.</p>
      </section>
    );
  }

  // C) signed in: change password and/or email (the new email is updated in the database)
  return (
    <section className="kg-forgot container">
      <h1>Change password or email</h1>
      <div className="row g-5">
        <div className="col-md-6">
          <h2>Change password</h2>
          <form className="kg-form" onSubmit={(e) => {
            e.preventDefault();
            if (cp.next !== cp.again) return run2(async () => { throw new Error('New passwords do not match.'); });
            run2(async () => {
              const r = await api.post('/users/change-password/', { current_password: cp.current, new_password: cp.next });
              setToken(r.data.token);
              setCp({ current: '', next: '', again: '' });
            }, 'Password changed.');
          }}>
            <label>Current password</label>
            <input className="form-control" type="password" required value={cp.current} onChange={(e) => setCp({ ...cp, current: e.target.value })} autoComplete="current-password" />
            <label>New password</label>
            <input className="form-control" type="password" minLength={8} required value={cp.next} onChange={(e) => setCp({ ...cp, next: e.target.value })} autoComplete="new-password" />
            <label>Confirm new password</label>
            <input className="form-control" type="password" required value={cp.again} onChange={(e) => setCp({ ...cp, again: e.target.value })} autoComplete="new-password" />
            <Flash s={s2} />
            <button className="kg-btn mt-3" disabled={s2.busy}>Change password</button>
          </form>
        </div>
        <div className="col-md-6">
          <h2>Change email</h2>
          <p className="kg-hint">Current: {user.email}</p>
          <form className="kg-form" onSubmit={(e) => {
            e.preventDefault();
            run3(async () => {
              const r = await api.post('/users/change-email/', { new_email: em.email, current_password: em.current });
              setUser(r.data);
              setEm({ email: '', current: '' });
            }, 'Email updated. Use the new email to sign in from now on.');
          }}>
            <label>New email</label>
            <input className="form-control" type="email" required value={em.email} onChange={(e) => setEm({ ...em, email: e.target.value })} autoComplete="email" />
            <label>Current password</label>
            <input className="form-control" type="password" required value={em.current} onChange={(e) => setEm({ ...em, current: e.target.value })} autoComplete="current-password" />
            <Flash s={s3} />
            <button className="kg-btn mt-3" disabled={s3.busy}>Change email</button>
          </form>
        </div>
      </div>
    </section>
  );
}
