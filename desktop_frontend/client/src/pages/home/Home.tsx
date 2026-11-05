import { Container } from 'react-bootstrap';
import mascot from '../../assets/mascot.svg';

export function Home() {
  return (
    <Container className="py-5 text-center">
        <img src={mascot} alt="Mascot" width="500" className="mt-4 mb-4 img-fluid" style ={{height: 'auto' }}/> 
      <h1 className="fw-black display-4">A Platform to Lock TF In.</h1>
      <p className="lead">Made by students, for students.</p>
    </Container>
  );
}