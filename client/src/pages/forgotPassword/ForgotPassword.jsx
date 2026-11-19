import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../../utils/api';
import urlConfig from '../../utils/urlConfig';
import '../login/auth.css';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErrMsg('');
    try {
      await api.patch(urlConfig.FORGOT_PASSWORD_URL, { email });
      navigate('/reset-password', { state: { email } });
    } catch (error) {
      setErrMsg(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-screen">
      <form className="auth-card card form" onSubmit={handleSubmit}>
        <h1>Forgot password</h1>
        <p className="muted">Enter your account email and we&apos;ll send you a 6 digit OTP.</p>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        {errMsg && <div className="alert alert-error" role="alert">{errMsg}</div>}
        <button type="submit" className="btn btn-block" disabled={loading}>{loading ? 'Sending…' : 'Send OTP'}</button>
        <p className="auth-switch"><Link to="/login">Back to log in</Link></p>
      </form>
    </main>
  );
}

export default ForgotPassword;
