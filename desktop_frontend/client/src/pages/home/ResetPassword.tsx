import { useState, type FormEvent } from 'react';
import { Container, Spinner } from 'react-bootstrap';
import mascot from '../../assets/mascot.svg';
import { authApi } from '../../lib/api';

const MIN_PASSWORD = 8;

interface ResetPasswordProps {
  /** Token from the emailed link (?reset=...). */
  token: string;
  onDone: () => void;
  onSwitchToLogin: () => void;
}

/** Shown when the app is opened from a password-reset email. */
export function ResetPassword({ token, onDone, onSwitchToLogin }: ResetPasswordProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
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
      await authApi.resetPassword(token, password);
      onDone();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container className="py-5 d-flex justify-content-center">
      <div className="panel text-center" style={{ maxWidth: '400px', width: '100%' }}>
        <img src={mascot} alt="Mascot" width="255" className="mt-4 mb-4 img-fluid" style={{ height: 'auto' }} />
        <h1 className="t-display mb-2 fs-3 fs-lg-2">Choose a new password</h1>
        <p className="text-ink-secondary mb-4 t-caption">Pick something you'll remember. Your old password stops working right away.</p>

        <form className="d-flex flex-column gap-3 text-start" onSubmit={handleSubmit}>
          {error && <div className="text-danger t-caption text-center">{error}</div>}

          <div>
            <label className="t-body-bold mb-1" htmlFor="reset-password">
              New password
            </label>
            <input
              id="reset-password"
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
            <label className="t-body-bold mb-1" htmlFor="reset-confirm">
              Confirm new password
            </label>
            <input
              id="reset-confirm"
              type="password"
              className="form-control-ea w-100"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <button type="submit" className="btn-pill btn-pill-ink w-100 mt-2 py-2 fw-bold" disabled={isLoading}>
            {isLoading ? <Spinner size="sm" animation="border" /> : 'Update password'}
          </button>

          <div className="text-center mt-2">
            <button type="button" className="bg-transparent border-0 link-ea p-0 t-caption fw-semibold" onClick={onSwitchToLogin}>
              ← Back to Log In
            </button>
          </div>
        </form>
      </div>
    </Container>
  );
}
