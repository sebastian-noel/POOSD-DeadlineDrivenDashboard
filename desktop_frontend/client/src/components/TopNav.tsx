import { Container, Nav, Navbar } from 'react-bootstrap';
import type { Page } from '../types';

const PAGES: Page[] = ['Dashboard', 'Milestones', 'Tasks', 'Focus timer', 'Calendar', 'Settings'];

interface TopNavProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
  onLogOut: () => void;
}

export function TopNav({ activePage, onNavigate, onLogOut }: TopNavProps) {
  return (
    <Navbar expand="lg" className="p-0" collapseOnSelect>
      <Container fluid className="p-0">
        <Navbar.Brand as="button" className="t-wordmark border-0 bg-transparent p-0 m-0" onClick={() => onNavigate('Dashboard')}>
          Erm Actually
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-nav" />
        <Navbar.Collapse id="main-nav" className="justify-content-between">
          <Nav className="mx-lg-auto gap-3 gap-lg-5 py-3 py-lg-0 align-items-lg-center" as="ul">
            {PAGES.map((page) => (
              <Nav.Item as="li" key={page}>
                <Nav.Link
                  as="button"
                  eventKey={page}
                  className={`nav-link-ea${page === activePage ? ' active' : ''}`}
                  aria-current={page === activePage ? 'page' : undefined}
                  onClick={() => onNavigate(page)}
                >
                  {page}
                </Nav.Link>
              </Nav.Item>
            ))}
          </Nav>
          <button type="button" className="btn-pill logout-btn" onClick={onLogOut}>
            Log out
          </button>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
