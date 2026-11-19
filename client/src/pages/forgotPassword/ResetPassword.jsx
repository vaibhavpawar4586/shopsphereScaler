import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../../utils/api';
import urlConfig from '../../utils/urlConfig';
import '../login/auth.css';

function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(location.state?.email || '');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrMsg('');
    if (password !== confirmPassword) {
      setErrMsg('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.patch(urlConfig.RESET_PASSWORD_URL, { email, otp, password, confirmPassword });
      setDone(true);
      setTimeout(() => navigate('/login'), 1500);
    } catch (error) {
      setErrMsg(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-screen">
      <form className="auth-card card form" onSubmit={handleSubmit}>
        <h1>Reset password</h1>
        {location.state?.email && (
          <div className="alert alert-info">If an account exists for {location.state.email}, we&apos;ve emailed it an OTP. It expires in 10 minutes.</div>
        )}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="otp">OTP</label>
          <input
            id="otp"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            required
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            autoComplete="one-time-code"
            placeholder="6 digit code"
          />
        </div>
        <div className="field">
          <label htmlFor="password">New password</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} maxLength={72} autoComplete="new-password" />
        </div>
        <div className="field">
          <label htmlFor="confirmPassword">Confirm new password</label>
          <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} maxLength={72} autoComplete="new-password" />
        </div>
        {errMsg && <div className="alert alert-error" role="alert">{errMsg}</div>}
        {done && <div className="alert alert-success">Password updated. Taking you to log in…</div>}
        <button type="submit" className="btn btn-block" disabled={loading || done}>{loading ? 'Saving…' : 'Reset password'}</button>
        <p className="auth-switch"><Link to="/forgot-password">Send a new OTP</Link></p>
      </form>
    </main>
  );
}

export default ResetPassword;
