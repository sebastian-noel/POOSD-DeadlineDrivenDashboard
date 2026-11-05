import { useState } from 'react';
import { Container, Accordion } from 'react-bootstrap';
import mascot from '../../assets/mascot.svg';

export function FAQ() {
  const [activeKey, setActiveKey] = useState<string | null>('0');

  return (
    <Container className="py-5 d-flex justify-content-center">
        <style>{`
        .faq-container .accordion-button:not(.collapsed) {
          background-color: #ffffff !important;
          color: #000000 !important;
          box-shadow: none !important;
        }
        .faq-container .accordion-button:focus {
          box-shadow: none !important;
          border-color: #000 !important;
        }
      `}</style>
      <div className="text-center faq-container" style={{ maxWidth: '750px', width: '100%' }}>
        
        {/* Mascot & Heading */}
        <div className="mb-4">
          <img 
            src={mascot} 
            alt="Erm Actually Mascot" 
            width="250" 
            className="mb-3 img-fluid" 
            style={{ height: 'auto' }}
          />
          <h2 className="t-wordmark text-uppercase text-ink-secondary mb-1">
            HERE'S OUR
          </h2>
          <h1 className="t-display">
            FREQUENTLY ASKED QUESTIONS
          </h1>
        </div>
        
        {/* Accordion FAQ List */}
        <div className="text-start mt-4">
          <Accordion activeKey={activeKey} onSelect={(k) => setActiveKey(k as string)}>
            
            <Accordion.Item eventKey="0" className="mb-3 border border-dark rounded overflow-hidden">
              <Accordion.Header className="t-body-bold">
                What if I end up having the time to complete only one of the time blocks?
              </Accordion.Header>
              <Accordion.Body className="text-ink-secondary">
                That's in the nature of students! Simply remove or reschedule that time block and the other time blocks will adapt with adaptive scheduling accordingly!
              </Accordion.Body>
            </Accordion.Item>

            <Accordion.Item eventKey="1" className="mb-3 border border-dark rounded overflow-hidden">
              <Accordion.Header className="t-body-bold">
                How does Erm Actually generate my schedule?
              </Accordion.Header>
              <Accordion.Body className="text-ink-secondary">
                Our algorithm takes your pending assignments, exams, and personal habits into account to automatically chunk your study sessions into sane, bite-sized time blocks.
              </Accordion.Body>
            </Accordion.Item>

            <Accordion.Item eventKey="2" className="mb-3 border border-dark rounded overflow-hidden">
              <Accordion.Header className="t-body-bold">
                Is this application completely free for students?
              </Accordion.Header>
              <Accordion.Body className="text-ink-secondary">
                Yes! Built by UCF students for COP4331, Erm Actually is designed to help everyone manage academic stress without breaking the bank.
              </Accordion.Body>
            </Accordion.Item>

            <Accordion.Item eventKey="3" className="mb-3 border border-dark rounded overflow-hidden">
              <Accordion.Header className="t-body-bold">
                Can I sync my calendar with Google or Canvas?
              </Accordion.Header>
              <Accordion.Body className="text-ink-secondary">
                We are actively working on robust integration features so you can pull assignments directly from your classes and push focus blocks straight to your calendar.
              </Accordion.Body>
            </Accordion.Item>

          </Accordion>
        </div>

      </div>
    </Container>
  );
}