import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/');
        } catch (err) {
            console.error("Logout failed:", err);
            // Fallback: force clear user state and navigate
            navigate('/');
        }
    };

    return (
        <nav className="navbar">
            <NavLink to="/" className="navbar-brand">
                <span className="brand-icon">⛳</span>
                <span>GolfGives</span>
            </NavLink>

            <div className="navbar-links">
                <NavLink to="/charities">Charities</NavLink>
                {user && user.role === 'admin' ? (
                    <>
                        <NavLink to="/admin">Admin Control</NavLink>
                    </>
                ) : user && user.role === 'user' ? (
                    <>
                        <NavLink to="/dashboard">Dashboard</NavLink>
                        <NavLink to="/scores/new">Submit Score</NavLink>
                        <NavLink to="/leaderboard">Leaderboard</NavLink>
                        <NavLink to="/draw">Monthly Draw</NavLink>
                    </>
                ) : (
                    <>
                        <NavLink to="/pricing">Pricing</NavLink>
                    </>
                )}
            </div>

            <div className="navbar-right">
                {user ? (
                    <>
                        <Link to="/profile" className="avatar-bubble" title={user.name}>{user.avatarInitials || user.name?.[0]?.toUpperCase()}</Link>
                        <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Logout</button>
                    </>
                ) : (
                    <>
                        <NavLink to="/login" className="btn btn-ghost btn-sm">Login</NavLink>
                        <NavLink to="/login" state={{ mode: 'admin' }} className="btn btn-primary btn-sm" style={{ background: 'var(--gold)', color: '#000' }}>Admin</NavLink>
                    </>
                )}
            </div>
        </nav>
    );
}
