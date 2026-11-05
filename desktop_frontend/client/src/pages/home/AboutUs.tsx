import { Container } from 'react-bootstrap';
import mascot from '../../assets/mascot.svg';

export function AboutUs() {
  return (
    <Container className="py-5 d-flex justify-content-center">
      <div className="text-center" style={{ maxWidth: '750px', width: '100%' }}>
        
        {/* Mascot */}
        <div className="mb-4">
          <img 
            src={mascot} 
            alt="Erm Actually Mascot" 
            width="250" 
            className="mb-3 img-fluid"
            tyle ={{height: 'auto' }}
          />
          <h2 className="t-wordmark text-uppercase text-ink-secondary mb-1">
            WHAT THE HECK IS
          </h2>
          <h1 className="t-display">
            "ERM ACTUALLY"?
          </h1>
        </div>
        
        {/* About Us */}
        <div className="text-start t-body d-flex flex-column gap-3 text-ink-secondary mt-5 px-md-4">
          <p>
            Well, firstly, this is a school project, we had to make something. BUT, we wanted to make something we'd actually use. What's more important to a student than having an academic comeback?
          </p>
          <p>
            We procrastinate, we forget assignments, and we end up getting overwhelmed once exams come around... so why not create something that'll automate a sane time block schedule and lower our cortisol without sacrificing our grades in the process?
          </p>
          <p className="t-body-bold" style={{ color: 'var(--color-ink)' }}>
            That's where Erm Actually comes along, making our lives easier, prioritizing ease of use and function over everything else.
          </p>
          <p className="t-body-bold text-center mt-5" style={{ color: 'var(--color-ink)' }}>
            Thank you for supporting our project! <br/>
            <span className="t-caption text-ink-secondary fw-normal">Built by UCF students for COP4331.</span>
          </p>
        </div>

      </div>
    </Container>
  );
}