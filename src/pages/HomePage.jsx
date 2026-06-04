import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import ThemeToggle from '../components/ThemeToggle';

const ROLE_LABELS = {
  customer:     'Customer',
  contractor:   'Contractor',
  dealer:       'Material Dealer',
  professional: 'CraftLink Professional',
};

export default function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // If not logged in at all, redirect to login
  useEffect(() => {
    if (!user) navigate('/login', { replace: true });
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'var(--bg-secondary)', padding: '20px', fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        backgroundColor: 'var(--card-bg)', padding: '40px', borderRadius: '24px',
        boxShadow: 'var(--card-shadow)', width: '100%', maxWidth: '400px',
        textAlign: 'center', border: '1px solid var(--border)'
      }}>

        {/* Logo & Theme Toggle */}
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
          <div style={{
            backgroundColor: '#1E3A5F', color: '#FFFFFF', padding: '10px 15px',
            borderRadius: '12px', fontWeight: '900', fontSize: '20px', letterSpacing: '-0.5px'
          }}>
            Build<span style={{ color: '#F97316' }}>R</span>
          </div>
          <ThemeToggle />
        </div>

        {/* Welcome message */}
        <h2 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '8px' }}>
          Welcome, {user.name}!
        </h2>

        {/* Role badge */}
        <div style={{
          display: 'inline-block', padding: '4px 12px', borderRadius: '99px',
          fontSize: '11px', fontWeight: '900', textTransform: 'uppercase',
          letterSpacing: '0.5px', marginBottom: '24px',
          backgroundColor: '#F97316', color: '#FFFFFF'
        }}>
          {ROLE_LABELS[user.role]}
        </div>

        {/* Status message */}
        <div style={{ marginBottom: '32px' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            You're logged in successfully. Your dashboard is being built.<br />
            <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>Check back soon!</span>
          </p>
        </div>

        {/* User info */}
        <div style={{
          textAlign: 'left', backgroundColor: 'var(--bg-tertiary)', padding: '20px',
          borderRadius: '16px', marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '12px'
        }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>
            📧 {user.email}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>
            📱 {user.phone || '—'}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>
            📍 {user.locationDetails?.city || user.locationDetails?.displayName || '—'}
          </div>
        </div>

        {/* Logout button */}
        <button 
          onClick={() => { logout(); navigate('/login'); }}
          style={{
            width: '100%', padding: '14px', backgroundColor: 'transparent',
            border: '1px solid var(--border)', borderRadius: '12px', fontSize: '14px',
            fontWeight: '700', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
