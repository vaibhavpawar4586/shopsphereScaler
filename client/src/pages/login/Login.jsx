import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../../context/auth/useAuth';
import { getErrorMessage } from '../../utils/api';
import './auth.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || '/';

  if (user) return <Navigate to={redirectTo} replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErrMsg('');
    try {
      await login(email, password);
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
        <h1>Log in</h1>
        <p className="muted">Welcome back to ShopSphere.</p>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <div className="field">
          <div className="row-between">
            <label htmlFor="password">Password</label>
            <Link to="/forgot-password" className="auth-small">Forgot password?</Link>
          </div>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </div>

        {errMsg && <div className="alert alert-error" role="alert">{errMsg}</div>}

        <button type="submit" className="btn btn-block" disabled={loading}>{loading ? 'Logging in…' : 'Log in'}</button>
        <p className="auth-switch">
          New to ShopSphere? <Link to="/signup" state={location.state}>Create an account</Link>
        </p>
      </form>
    </main>
  );
}

export default Login;
