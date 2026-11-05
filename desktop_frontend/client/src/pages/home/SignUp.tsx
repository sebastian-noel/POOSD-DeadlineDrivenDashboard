import { useState, type FormEvent } from 'react';
import { Container, Spinner } from 'react-bootstrap';
import mascot from '../../assets/mascot.svg';
import { authApi } from '../../lib/api';

const MIN_PASSWORD = 8;

interface SignUpProps {
  onSwitchToLogin: () => void;
}

export function SignUp({ onSwitchToLogin }: SignUpProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [created, setCreated] = useState(false);
  const [resendStatus, setResendStatus] = useState('');

  const handleSignUpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setIsLoading(true);
    try {
      // The API emails a verification link; the account can log in once it is clicked.
      await authApi.register(email, password);
      setCreated(true);
    } catch (err: unknown) {
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
        <h1 className="t-display mb-4">{created ? 'Check your email' : 'Create Account'}</h1>

        {created ? (
          <div className="d-flex flex-column gap-3">
            <div className="alert alert-success t-caption text-center py-3 mb-0">
              We sent a verification link to <strong>{email}</strong>. Open it to activate your account, then log in.
            </div>
            {resendStatus && <div className="text-ink-secondary t-caption text-center">{resendStatus}</div>}
            <button type="button" className="btn-pill btn-pill-ink w-100 py-2 fw-bold" onClick={onSwitchToLogin}>
              Go to Log In
            </button>
            <button type="button" className="bg-transparent border-0 link-ea p-0 t-caption" onClick={resendVerification}>
              Didn't get it? Resend the email
            </button>
          </div>
        ) : (
          <form className="d-flex flex-column gap-3 text-start" onSubmit={handleSignUpSubmit}>
            {error && <div className="text-danger t-caption text-center">{error}</div>}

            <div>
              <label className="t-body-bold mb-1" htmlFor="signup-email">
                Email
              </label>
              <input
                id="signup-email"
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
              <label className="t-body-bold mb-1" htmlFor="signup-password">
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                className="form-control-ea w-100"
                placeholder={`At least ${MIN_PASSWORD} characters`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={MIN_PASSWORD}
                required
              />
            </div>
            <div>
              <label className="t-body-bold mb-1" htmlFor="signup-confirm">
                Confirm Password
              </label>
              <input
                id="signup-confirm"
                type="password"
                className="form-control-ea w-100"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <button type="submit" className="btn-pill btn-pill-ink w-100 mt-2 py-2" disabled={isLoading}>
              {isLoading ? <Spinner size="sm" animation="border" /> : 'Sign Up'}
            </button>
          </form>
        )}

        {!created && (
          <p className="t-caption mt-4 mb-0 text-ink-secondary">
            Already have an account?{' '}
            <button className="bg-transparent border-0 link-ea p-0" onClick={onSwitchToLogin}>
              Log in
            </button>
          </p>
        )}
      </div>
    </Container>
  );
}
