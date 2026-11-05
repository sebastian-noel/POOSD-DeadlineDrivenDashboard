import { Container, Nav, Navbar } from 'react-bootstrap'; // prebuilt nav bar
import mascotLogo from '../assets/mascot.svg'; // import mascot image
import type { HomePage } from '../types';

// static route definition
const PAGES: HomePage[] = [
  'Home', 
  'About Us', 
  'FAQ', 
  'Privacy Policy & ToS', 
  'Contact'
];

interface HomeTopNavProps {
  activePage: HomePage; // receives current active view to determine which link gets underlined or bolded
  onNavigate: (page: HomePage) => void; // callback when user clicks a nav link
  onLoginClick: () => void; // callback function passed down when user clicks "Log In"
  onSignUpClick: () => void; // same as above for "Sign Up"
}

export function HomeTopNav({ activePage, onNavigate, onLoginClick, onSignUpClick }: HomeTopNavProps){
    return (
        // expand controls mobile menu response type, collapses as soon as user selects
        <Navbar expand="lg" className="border-bottom border-dark py-2" collapseOnSelect>
            <Container>
                {/* Brand: Mascot + Title */}
                <Navbar.Brand 
                  as="button" 
                  className="d-flex flex-column align-items-center justify-content-center border-0 bg-transparent p-0 text-dark mx-auto"
                  onClick={() => onNavigate('Home')}
                >
                    <img
                        src={mascotLogo}
                        alt="Erm Actually Mascot"
                        width="115"
                        className="d-inline-block ms-5 marginRight: '20px'"
                        style={{height: 'auto'}}
                    />
                </Navbar.Brand>

                {/* Mobile Hamburger Toggle */}
                <Navbar.Toggle aria-controls="public-nav-collapse" />

                {/* Collapsible Section (Everything inside here hides behind the hamburger on mobile) */}
                <Navbar.Collapse id="public-nav-collapse">
                    
                    {/* DESKTOP ONLY: Nav Links (Hidden on mobile via d-none, visible on large screens via d-lg-flex) */}
                    <Nav className="mx-auto gap-lg-4 align-items-center" as="ul">
                        {PAGES.map((page) => (
                            <Nav.Item as="li" key={page}>
                                <Nav.Link
                                    as="button"
                                    eventKey={page}
                                    className={`border-0 bg-transparent text-dark px-2 py-1 ${
                                        page === activePage ? 'fw-bold text-decoration-underline' : 'opacity-75'
                                    }`}
                                    aria-current={page === activePage ? 'page' : undefined}
                                    onClick={() => onNavigate(page)}
                                >
                                    {page}
                                </Nav.Link>
                            </Nav.Item>
                        ))}
                    </Nav>

                    {/* DESKTOP ONLY: Log In & Sign Up buttons */}
                    <div className="d-none d-lg-flex align-items-center gap-2">
                        <button
                            type="button"
                            className="btn btn-outline-dark rounded-pill px-4 py-1 fw-semibold"
                            onClick={onLoginClick}
                        >
                            Log In
                        </button>
                        <button
                            type="button"
                            className="btn btn-dark rounded-pill px-4 py-1 fw-semibold"
                            onClick={onSignUpClick}
                        >
                            Sign Up
                        </button>
                    </div>

                    {/* MOBILE ONLY: Stacked Log In & Sign Up buttons */}
                    <div className="d-flex d-lg-none flex-column gap-2 pt-3 pb-2 w-100">
                        <button
                            type="button"
                            className="btn btn-outline-dark rounded-pill py-2 w-100 fw-semibold"
                            onClick={onLoginClick}
                        >
                            Log In
                        </button>
                        <button
                            type="button"
                            className="btn btn-dark rounded-pill py-2 w-100 fw-semibold"
                            onClick={onSignUpClick}
                        >
                            Sign Up
                        </button>
                    </div>

                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
}