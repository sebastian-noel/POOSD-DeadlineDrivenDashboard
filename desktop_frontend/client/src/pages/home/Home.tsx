import { Container, Row, Col } from 'react-bootstrap';
import mascot from '../../assets/mascot.svg';
import calendar from '../../assets/calendar.jpg';
import checklist from '../../assets/checklist.jpg';
import clock from '../../assets/clock.jpg';

export function Home() {
  return (
    <Container className="py-5 d-flex flex-column align-items-center">
      
      {/* Hero Section */}
      <div className="text-center mt-5 mb-5" style={{ maxWidth: '900px', width: '100%' }}>
        
        {/* Stacks on mobile (flex-column), side-by-side on desktop (flex-md-row) */}
        <div className="d-flex flex-column flex-md-row justify-content-center align-items-center gap-3 gap-md-4 mb-4">
          <img 
            src={mascot} 
            alt="Erm Actually Mascot" 
            width="350" 
            className="img-fluid"
            style={{ height: 'auto' }}
          />
          <h1 className="t-display mb-0" style={{ fontSize: 'clamp(3.5rem, 10vw, 6.5rem)', lineHeight: '1', textAlign: 'left' }}>
            LOCK <br/>TF IN.
          </h1>
        </div>

        {/* Subhead / Tagline */}
        <h2 className="t-wordmark text-uppercase text-ink-secondary mt-5 mb-5 fs-5">
          Project made by Team 8 for COP4331
        </h2>
        
        {/* Figma Body Copy */}
        <p className="t-body fs-5 text-ink-secondary px-md-5 mx-auto" style={{ maxWidth: '750px' }}>
          Making every hour purposeful. So you never submit another late assignment. 
          Making sure you focus on one thing at a time.<br/><br/>
          <strong style={{ color: 'var(--color-ink, #000)' }}>MADE BY STUDENTS. FOR STUDENTS.</strong>
        </p>
      </div>

      {/* Features Section (3 Columns) */}
      <Row className="text-center w-100 mt-5 gap-5 gap-md-0" style={{ maxWidth: '900px' }}>
        
        {/* Feature 1 */}
        <Col md={4} className="d-flex flex-column align-items-center">
          <div className="mt-5 mb-3" style={{height: 'auto' }}>
            <img src={checklist} alt="Daily Reminders" className="img-fluid w-100 h-100" style={{ objectFit: 'cover' }} />
          </div>
          <h1 className="t-display mb-5" style={{lineHeight: '1', textAlign: 'center' }}>DAILY REMINDERS.</h1>
        </Col>
        
        {/* Feature 2 */}
        <Col md={4} className="d-flex flex-column align-items-center">
          <div className="mt-5 mb-3" style={{ height: 'auto' }}>
            <img src={clock} alt="Time Blocking" className="img-fluid w-100 h-100" style={{ objectFit: 'cover' }} />
          </div>
          <h1 className="t-display mb-5" style={{ lineHeight: '1', textAlign: 'center' }}>TIME BLOCKING.</h1>
        </Col>
        
        {/* Feature 3 */}
        <Col md={4} className="d-flex flex-column align-items-center">
          <div className="mt-5 mb-3" style={{ height: 'auto' }}>
            <img src={calendar} alt="Deadline Based" className="img-fluid w-100 h-100" style={{ objectFit: 'cover' }} />
          </div>
          <h1 className="t-display mb-5" style={{ lineHeight: '1', textAlign: 'center' }}>DEADLINE BASED.</h1>
        </Col>

      </Row>

    </Container>
  );
}