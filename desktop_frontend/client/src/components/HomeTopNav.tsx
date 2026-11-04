import { Container, Nav, Navbar } from 'react-bootstrap';
import type { HomePage } from '../types';

const PAGES: HomePage[] = ['Home', 'About Us', 'FAQ', 
    'Privacy Policy & ToS', 'Contact'];

interface HomeTopNavProps {
  activePage: HomePage;
  onNavigate: (page: HomePage) => void;
  onLoginClick: () => void;
  onSigninClick: () => void;
}

export function HomeTopNav({ activePage, onNavigate, onLoginClick, onSigninClick }: TopNavProps){
    return (
            
    );
}  