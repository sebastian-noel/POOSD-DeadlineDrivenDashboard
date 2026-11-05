import { useState } from 'react';
import { Container, Spinner } from 'react-bootstrap';
import mascot from '../../assets/mascot.svg';

interface ForgotPasswordProps {
  onSwitchToLogin: () => void;
}

export function ForgotP({ onSwitchToLogin }: ForgotPasswordProps) {
  // 1. State for email input, errors, loading status, and success state
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // 2. The AJAX function that talks to Express backend for password reset
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Replace URL with actual backend password reset endpoint
      const response = await fetch('http://localhost:5000/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send password reset instructions.');
      }

      setIsSubmitted(true);
      
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
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
          Enter your email address and we'll send you instructions to reset your password.
        </p>
        
        {isSubmitted ? (
          <div className="d-flex flex-column gap-3">
            <div className="alert alert-success t-caption text-center py-3">
              If an account exists for <strong>{email}</strong>, you will receive a reset link shortly.
            </div>
            <button 
              type="button" 
              className="btn-pill btn-pill-ink w-100 py-2 fw-bold"
              onClick={onSwitchToLogin}
            >
              Back to Log In
            </button>
          </div>
        ) : (
          <form className="d-flex flex-column gap-3 text-start" onSubmit={handleForgotSubmit}>
            
            {/* Show error message if request fails */}
            {error && <div className="text-danger t-caption text-center">{error}</div>}

            <div>
              <label className="t-body-bold mb-1">Email</label>
              <input 
                type="email" 
                className="form-control-ea w-100" 
                placeholder="student@ucf.edu" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
            
            <button type="submit" className="btn-pill btn-pill-ink w-100 mt-2 py-2 fw-bold" disabled={isLoading}>
              {isLoading ? <Spinner size="sm" animation="border" /> : 'Send Reset Link'}
            </button>

            <div className="text-center mt-2">
              <button 
                type="button" 
                className="bg-transparent border-0 link-ea p-0 t-caption fw-semibold" 
                onClick={onSwitchToLogin}
              >
                ← Back to Log In
              </button>
            </div>
          </form>
        )}
      </div>
    </Container>
  );
}