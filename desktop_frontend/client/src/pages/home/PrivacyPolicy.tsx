import { Container } from 'react-bootstrap';
import mascot from '../../assets/mascot.svg';

export function PrivacyPolicy() {
  return (
    <Container className="py-5 d-flex justify-content-center">
      <div className="text-start" style={{ maxWidth: '800px', width: '100%' }}>
        
        {/* Header with Mascot */}
        <div className="text-center mb-5">
          <img 
            src={mascot} 
            alt="Erm Actually Mascot" 
            width="250" 
            className="img-fluid" 
            style={{ height: 'auto' }}
          />

          <h2 className="t-wordmark text-uppercase text-ink-secondary mb-1">
            LEGAL STUFF
          </h2>
          <h1 className="t-display">
            PRIVACY POLICY & TERMS OF SERVICE
          </h1>
          <p className="text-ink-secondary t-caption mt-2">
            Last updated: November 2026
          </p>
        </div>

        {/* Section 1: Privacy Policy */}
        <div className="mb-5">
          <h3 className="t-body-bold mb-3 fs-4 border-bottom border-dark pb-2">
            1. Privacy Policy
          </h3>
          <p className="text-ink-secondary mb-3">
            At <strong>Erm, Actually</strong>, we respect your privacy as students and developers. Because this is an academic project built for COP4331, we only collect the minimum information necessary to make the app function, such as your email address and authentication tokens.
          </p>
          <ul className="text-ink-secondary d-flex flex-column gap-2 mb-0">
            <li><strong>Data Collection:</strong> We store your account credentials securely to let you log in and manage your study blocks.</li>
            <li><strong>Data Sharing:</strong> We do not sell, trade, or rent your personal information to third parties. Your data stays within the app ecosystem.</li>
            <li><strong>Security:</strong> We implement standard password hashing and token management to keep your account safe.</li>
          </ul>
        </div>

        {/* Section 2: Terms of Service */}
        <div className="mb-4">
          <h3 className="t-body-bold mb-3 fs-4 border-bottom border-dark pb-2">
            2. Terms of Service
          </h3>
          <p className="text-ink-secondary mb-3">
            By accessing or using <strong>Erm, Actually</strong>, you agree to be bound by these terms. If you disagree with any part of these terms, you may not access our service.
          </p>
          <ul className="text-ink-secondary d-flex flex-column gap-2 mb-0">
            <li><strong>Acceptable Use:</strong> You agree to use this application solely for scheduling, task management, and personal productivity.</li>
            <li><strong>Account Responsibility:</strong> You are responsible for safeguarding the password that you use to access the service and for any activities under your account.</li>
            <li><strong>Project Disclaimer:</strong> This software is provided "as is" without warranty of any kind, expressed or implied. As a student-built project, uptime and continuous availability are not guaranteed.</li>
          </ul>
        </div>

        {/* Contact Note */}
        <div className="mt-5 p-4 border border-dark rounded bg-light text-center">
          <p className="mb-0 text-ink-secondary t-caption">
            Have questions about our privacy practices or terms? Feel free to reach out via our <a href="#" className="link-ea fw-bold">Contact page</a>!
          </p>
        </div>

      </div>
    </Container>
  );
}