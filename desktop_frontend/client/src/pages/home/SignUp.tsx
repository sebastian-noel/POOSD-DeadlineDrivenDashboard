import { useState } from 'react';
import { Container, Spinner } from 'react-bootstrap';
import mascot from '../../assets/mascot.svg';

interface SignUpProps {
  onSwitchToLogin: () => void;
  onSignUpSuccess: () => void;
}

export function SignUp({ onSwitchToLogin, onSignUpSuccess }: SignUpProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Quick validation check
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      // Replace with your actual backend register endpoint
      const response = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create account');
      }

      // If sign-up returns a token, log them in automatically
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      
      onSignUpSuccess(); // Switches app state to the dashboard
      
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
      <div className="panel text-center" style={{ maxWidth: '400px', width: '100%' }}>
        <img src={mascot} alt="Mascot" width="255" className="mt-4 mb-4" style ={{height: 'auto' }}/> 
        <h1 className="t-display mb-4">Create Account</h1>
        
        <form className="d-flex flex-column gap-3 text-start" onSubmit={handleSignUpSubmit}>
          
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
          <div>
            <label className="t-body-bold mb-1">Password</label>
            <input 
              type="password" 
              className="form-control-ea w-100" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>
          <div>
            <label className="t-body-bold mb-1">Confirm Password</label>
            <input 
              type="password" 
              className="form-control-ea w-100" 
              placeholder="••••••••" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required 
            />
          </div>
          
          <button type="submit" className="btn-pill btn-pill-ink w-100 mt-2 py-2" disabled={isLoading}>
            {isLoading ? <Spinner size="sm" animation="border" /> : 'Sign Up'}
          </button>
        </form>

        <p className="t-caption mt-4 mb-0 text-ink-secondary">
          Already have an account?{' '}
          <button className="bg-transparent border-0 link-ea p-0" onClick={onSwitchToLogin}>
            Log in
          </button>
        </p>
      </div>
    </Container>
  );
}