import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'

function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false)
    const location = useLocation()

    const navLinks = [
        { to: '/', label: 'Home' },
        { to: '/dashboard', label: 'Dashboards' },
        { to: '/chat', label: 'AI Chat' },
        { to: '/contact', label: 'Contact' },
    ]

    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <Link to="/" onClick={() => setMenuOpen(false)}>
                    Anuj Shandilya
                </Link>
            </div>

            <button
                className="mobile-menu-btn"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Toggle menu"
            >
                {menuOpen ? '✕' : '☰'}
            </button>

            <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
                {navLinks.map((link) => (
                    <Link
                        key={link.to}
                        to={link.to}
                        className={location.pathname === link.to ? 'active' : ''}
                        onClick={() => setMenuOpen(false)}
                    >
                        {link.label}
                    </Link>
                ))}
            </div>
        </nav>
    )
}

export default Navbar