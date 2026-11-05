import { useState } from 'react';
import { Container, Spinner } from 'react-bootstrap';
import mascot from '../../assets/mascot.svg';

export function Contact() {
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState({ success: false, message: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus({ success: false, message: '' });

    try {
      const response = await fetch('http://localhost:5000/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, subject, message }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send message.');
      }

      setStatus({ success: true, message: 'Message sent successfully! We will reach out ASAP.' });
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setStatus({ success: false, message: err.message });
      } else {
        setStatus({ success: false, message: 'An unexpected error occurred.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container className="py-5 d-flex justify-content-center">
      <div className="panel text-center " style={{ maxWidth: '550px', width: '100%' }}>
        
        {/* Mascot & Heading */}
        <div className="mb-4 d-flex align-items-center justify-content-center gap-3 text-start">
          <img 
            src={mascot} 
            alt="Erm Actually Mascot" 
            width="192" 
            className="img-fluid" 
            style={{ height: 'auto' }}
          />
          <div>
            <h2 className="t-wordmark text-uppercase text-ink-secondary mb-0" style={{ fontSize: '1.1rem' }}>
              ERM... ACTUALLY
            </h2>
            <h1 className="t-display text-wrap fs-3 fs-md-2 fs-lg-1 text-break" style={{ fontSize: '2.2rem', lineHeight: '1.1' }}>
              HOW DO YOU<br />CONTACT US?
            </h1>
          </div>
        </div>

        <p className="text-ink-secondary mb-4 fw-semibold">
          Contact us here and we'll reach out ASAP!
        </p>

        {/* Status Feedback Message */}
        {status.message && (
          <div className={`alert ${status.success ? 'alert-success' : 'alert-danger'} t-caption mb-3 text-center`}>
            {status.message}
          </div>
        )}

        {/* Contact Form */}
        <form className="d-flex flex-column gap-3 text-start" onSubmit={handleContactSubmit}>
          <div>
            <input 
              type="email" 
              className="form-control-ea w-100" 
              placeholder="Email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          <div>
            <input 
              type="text" 
              className="form-control-ea w-100" 
              placeholder="Subject" 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required 
            />
          </div>
          <div>
            <textarea 
              className="form-control-ea w-100" 
              placeholder="Write what you want to say here..." 
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              style={{ resize: 'vertical', borderRadius: '1.5rem' }}
            />
          </div>
          
          <button type="submit" className="btn-pill btn-pill-ink w-100 mt-2 py-2 fw-bold" disabled={isLoading}>
            {isLoading ? <Spinner size="sm" animation="border" /> : 'Send message'}
          </button>
        </form>

      </div>
    </Container>
  );
}