import { useState, type FormEvent } from 'react';
import { Container, Spinner } from 'react-bootstrap';
import mascot from '../../assets/mascot.svg';
import { authApi } from '../../lib/api';

interface ForgotPasswordProps {
  onSwitchToLogin: () => void;
}

export function ForgotP({ onSwitchToLogin }: ForgotPasswordProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Asks the API to email a reset link. The response is the same whether or not the account exists.
  const handleForgotSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await authApi.forgotPassword(email);
      setIsSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container className="py-5 d-flex justify-content-center">
      <div className="panel text-center overflow-hidden text-break" style={{ maxWidth: '400px', width: '100%' }}>
        <img src={mascot} alt="Mascot" width="255" className="mt-4 mb-4 img-fluid" style={{ height: 'auto' }} />
        <h1 className="t-display mb-2 fs-3 fs-lg-2">Reset Password</h1>
        <p className="text-ink-secondary mb-4 t-caption">
          Enter your email address and we'll send you a link to choose a new password.
        </p>

        {isSubmitted ? (
          <div className="d-flex flex-column gap-3">
            <div className="alert alert-success t-caption text-center py-3">
              If an account exists for <strong>{email}</strong>, you will receive a reset link shortly. It expires in one hour.
            </div>
            <button type="button" className="btn-pill btn-pill-ink w-100 py-2 fw-bold" onClick={onSwitchToLogin}>
              Back to Log In
            </button>
          </div>
        ) : (
          <form className="d-flex flex-column gap-3 text-start" onSubmit={handleForgotSubmit}>
            {error && <div className="text-danger t-caption text-center">{error}</div>}

            <div>
              <label className="t-body-bold mb-1" htmlFor="forgot-email">
                Email
              </label>
              <input
                id="forgot-email"
                type="email"
                className="form-control-ea w-100"
                placeholder="student@ucf.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <button type="submit" className="btn-pill btn-pill-ink w-100 mt-2 py-2 fw-bold" disabled={isLoading}>
              {isLoading ? <Spinner size="sm" animation="border" /> : 'Send Reset Link'}
            </button>

            <div className="text-center mt-2">
              <button type="button" className="bg-transparent border-0 link-ea p-0 t-caption fw-semibold" onClick={onSwitchToLogin}>
                ← Back to Log In
              </button>
            </div>
          </form>
        )}
      </div>
    </Container>
  );
}
