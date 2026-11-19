import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../../context/auth/useAuth';
import { getErrorMessage } from '../../utils/api';
import '../login/auth.css';

function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const { user, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || '/';

  if (user) return <Navigate to={redirectTo} replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrMsg('');
    if (password !== confirmPassword) {
      setErrMsg('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await signup({ name, email, password, confirmPassword });
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setErrMsg(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-screen">
      <form className="auth-card card form" onSubmit={handleSubmit}>
        <h1>Create account</h1>
        <p className="muted">Sign up to place orders and track deliveries.</p>

        <div className="field">
          <label htmlFor="name">Name</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} autoComplete="name" />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} maxLength={72} autoComplete="new-password" />
          <small>At least 8 characters.</small>
        </div>
        <div className="field">
          <label htmlFor="confirmPassword">Confirm password</label>
          <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} maxLength={72} autoComplete="new-password" />
        </div>

        {errMsg && <div className="alert alert-error" role="alert">{errMsg}</div>}

        <button type="submit" className="btn btn-block" disabled={loading}>{loading ? 'Creating account…' : 'Sign up'}</button>
        <p className="auth-switch">
          Already have an account? <Link to="/login" state={location.state}>Log in</Link>
        </p>
      </form>
    </main>
  );
}

export default Signup;
