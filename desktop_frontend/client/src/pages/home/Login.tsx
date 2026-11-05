import { useState } from 'react';
import { Container, Spinner } from 'react-bootstrap';
import mascot from '../../assets/mascot.svg';

interface LoginProps {
  onSwitchToSignUp: () => void;
  onLoginSuccess: () => void;
  onSwitchToForgotPwd: () => void;
}

export function Login({ onSwitchToSignUp, onLoginSuccess, onSwitchToForgotPwd }: LoginProps) {
  // 1. Add state for the form inputs, errors, and loading status
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 2. The AJAX function that talks to Express backend
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Replace URL with actual backend API endpoint
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      // saves token
      if (data.token) {
        localStorage.setItem('token', data.token); // Stores the key in the browser
        onLoginSuccess(); // Tells App.tsx to switch to dash
      } else {
        throw new Error('Login succeeded, but no authentication token was received.');
      }
      
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    }
  };

  return (
    <Container className="py-5 d-flex justify-content-center">
      <div className="panel text-center" style={{ maxWidth: '400px', width: '100%' }}>
        <img src={mascot} alt="Mascot" width="255" className="mt-4 mb-4" style ={{height: 'auto' }}/> 
        <h1 className="t-display mb-4">Log In</h1>
        
        {/* Update the form to use the new submit handler */}
        <form className="d-flex flex-column gap-3 text-start" onSubmit={handleLoginSubmit}>
          
          {/* Show error message if login fails */}
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
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label className="t-body-bold mb-0">Password</label>
            </div>
            <input 
              type="password" 
              className="form-control-ea w-100" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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