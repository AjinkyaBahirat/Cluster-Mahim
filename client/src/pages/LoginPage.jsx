import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { Globe, Sun, Moon } from 'lucide-react';

const LoginPage = () => {
  const { login } = useAuth();
  const { toggleLanguage, t, language } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [role, setRole] = useState('cluster'); // 'cluster' or 'hm'
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(phone, password, role, rememberMe);
      if (user.role === 'cluster') {
        navigate('/cluster');
      } else {
        navigate('/hm');
      }
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.error || t('login.error')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Floating controls */}
      <div style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 100, display: 'flex', gap: '8px' }}>
        <button 
          onClick={toggleTheme} 
          className="btn btn--secondary" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button 
          onClick={toggleLanguage} 
          className="btn btn--secondary" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Globe size={16} />
          <span>{language === 'en' ? 'मराठीत पहा' : 'View in English'}</span>
        </button>
      </div>

      <div className="login-card">
        <div className="login-card__logo">🏫</div>
        <h2 className="login-card__title">{t('app.title')}</h2>
        <p className="login-card__subtitle">{t('app.subtitle')}</p>

        <div className="role-toggle">
          <button
            type="button"
            className={`role-toggle__btn ${role === 'cluster' ? 'role-toggle__btn--active' : ''}`}
            onClick={() => {
              setRole('cluster');
              setError('');
            }}
          >
            {t('role.cluster')}
          </button>
          <button
            type="button"
            className={`role-toggle__btn ${role === 'hm' ? 'role-toggle__btn--active' : ''}`}
            onClick={() => {
              setRole('hm');
              setError('');
            }}
          >
            {t('role.hm')}
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('login.phone')}</label>
            <input
              type="tel"
              className="form-input"
              placeholder={t('login.phone.placeholder')}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('login.password')}</label>
            <input
              type="password"
              className="form-input"
              placeholder={t('login.password.placeholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
            />
            <label htmlFor="rememberMe" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
              {t('login.remember')}
            </label>
          </div>

          {error && <div className="form-error" style={{ marginBottom: '16px' }}>{error}</div>}

          <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
            {loading ? <div className="spinner"></div> : t('login.signin')}
          </button>
        </form>

        {role === 'hm' && (
          <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <p>{t('mr' === language ? 'मुख्याध्यापक लॉगिन क्लस्टर अधिकाऱ्याद्वारे तयार केले जाते.' : 'Headmaster logins are created by the Cluster Officer.')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
