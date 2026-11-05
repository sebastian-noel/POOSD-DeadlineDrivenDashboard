import { useState, type FormEvent } from 'react';
import { Container, Spinner } from 'react-bootstrap';
import mascot from '../../assets/mascot.svg';
import { ApiError, authApi, session, type ApiUser } from '../../lib/api';

export interface Notice {
  kind: 'success' | 'danger' | 'info';
  text: string;
}

interface LoginProps {
  onSwitchToSignUp: () => void;
  onLoginSuccess: (user: ApiUser) => void;
  onSwitchToForgotPwd: () => void;
  /** Message from a previous step, e.g. "Email verified" after clicking the emailed link. */
  notice?: Notice | null;
}

export function Login({ onSwitchToSignUp, onLoginSuccess, onSwitchToForgotPwd, notice }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendStatus, setResendStatus] = useState('');

  // AJAX login against the Express API: on success the JWT is stored and App switches to the dashboard.
  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setResendStatus('');
    setIsLoading(true);
    try {
      const result = await authApi.login(email, password);
      session.set(result.accessToken);
      onLoginSuccess(result.user);
    } catch (err: unknown) {
      setNeedsVerification(err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED');
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const resendVerification = async () => {
    try {
      const result = await authApi.resendVerification(email);
      setResendStatus(result.message);
    } catch (err: unknown) {
      setResendStatus(err instanceof Error ? err.message : 'Could not resend the email');
    }
  };

  return (
    <Container className="py-5 d-flex justify-content-center">
      <div className="panel text-center" style={{ maxWidth: '400px', width: '100%' }}>
        <img src={mascot} alt="Mascot" width="255" className="mt-4 mb-4" style={{ height: 'auto' }} />
        <h1 className="t-display mb-4">Log In</h1>

        {notice && <div className={`alert alert-${notice.kind} t-caption text-center py-2`}>{notice.text}</div>}

        <form className="d-flex flex-column gap-3 text-start" onSubmit={handleLoginSubmit}>
          {error && (
            <div className="text-danger t-caption text-center">
              {error}
              {needsVerification && (
                <div className="mt-1">
                  <button type="button" className="bg-transparent border-0 link-ea p-0 t-caption" onClick={resendVerification}>
                    Resend verification email
                  </button>
                </div>
              )}
            </div>
          )}
          {resendStatus && <div className="text-ink-secondary t-caption text-center">{resendStatus}</div>}

          <div>
            <label className="t-body-bold mb-1" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              className="form-control-ea w-100"
              placeholder="student@ucf.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div>
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label className="t-body-bold mb-0" htmlFor="login-password">
                Password
              </label>
            </div>
            <input
              id="login-password"
              type="password"
              className="form-control-ea w-100"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button type="button" className="bg-transparent border-0 link-ea p-0 t-caption mt-3" onClick={onSwitchToForgotPwd}>
              Forgot Password?
            </button>
          </div>

          <button type="submit" className="btn-pill btn-pill-ink w-100 mt-2 py-2" disabled={isLoading}>
            {isLoading ? <Spinner size="sm" animation="border" /> : 'Log In'}
          </button>
        </form>

        <p className="t-caption mt-4 mb-0 text-ink-secondary">
          Don't have an account?{' '}
          <button className="bg-transparent border-0 link-ea p-0" onClick={onSwitchToSignUp}>
            Sign up
          </button>
        </p>
      </div>
    </Container>
  );
}
