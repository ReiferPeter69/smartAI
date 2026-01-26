import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { logout } = useAuth();

  return (
    <div className="layout">
      <header className="header">
        <div className="container header-content">
          <Link to="/" className="logo">
            <h1>OBSIDIAN</h1>
            <span className="subtitle">Architect Prime v3.0</span>
          </Link>
          <nav className="nav">
            <Link to="/" className="nav-link">
              Projects
            </Link>
            <Link to="/projects/new" className="nav-link">
              New Project
            </Link>
            <button onClick={logout} className="btn-logout">
              Logout
            </button>
          </nav>
        </div>
      </header>
      <main className="main">
        <div className="container">{children}</div>
      </main>
    </div>
  );
}
