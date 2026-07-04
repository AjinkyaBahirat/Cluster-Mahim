import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { 
  LayoutDashboard, 
  Megaphone, 
  ClipboardList, 
  Menu, 
  X, 
  Globe, 
  Sun, 
  Moon, 
  LogOut 
} from 'lucide-react';
import Modal from './Modal';

const BottomNav = () => {
  const { user, logout } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (!user) return null;

  const rolePath = user.role === 'cluster' ? '/cluster' : '/hm';

  const navItems = [
    {
      icon: LayoutDashboard,
      label: t('nav.dashboard'),
      path: rolePath,
      exact: true
    },
    {
      icon: Megaphone,
      label: language === 'en' ? 'Notices' : 'सूचना',
      path: `${rolePath}/announcements`,
      exact: false
    },
    {
      icon: ClipboardList,
      label: language === 'en' ? 'Forms' : 'फॉर्म्स',
      path: `${rolePath}/forms`,
      exact: false
    }
  ];

  const handleNavClick = (path) => {
    navigate(path);
  };

  return (
    <>
      <nav className="bottom-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact 
            ? location.pathname === item.path 
            : location.pathname.startsWith(item.path);

          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className={`bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}
            >
              <Icon size={22} />
              <span>{item.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => setIsMenuOpen(true)}
          className="bottom-nav__item"
        >
          <Menu size={22} />
          <span>{language === 'en' ? 'Menu' : 'मेनू'}</span>
        </button>
      </nav>

      <Modal 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
        title={language === 'en' ? 'Quick Settings' : 'द्रुत सेटिंग्ज'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '8px 0' }}>
          {/* User info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{user.name}</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {user.role === 'cluster' ? t('role.cluster') : user.school_name || t('role.hm')}
            </span>
          </div>

          {/* Theme Switcher */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{language === 'en' ? 'Theme Mode' : 'थीम प्रकार'}</span>
            <button 
              onClick={toggleTheme} 
              className="btn btn--secondary" 
              style={{ minHeight: 'unset', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              <span>{theme === 'dark' ? (language === 'en' ? 'Light' : 'प्रकाशित') : (language === 'en' ? 'Dark' : 'गडद')}</span>
            </button>
          </div>

          {/* Language Switcher */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{language === 'en' ? 'App Language' : 'अॅपची भाषा'}</span>
            <button 
              onClick={toggleLanguage} 
              className="btn btn--secondary" 
              style={{ minHeight: 'unset', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Globe size={16} />
              <span>{language === 'en' ? 'मराठी' : 'English'}</span>
            </button>
          </div>

          {/* Logout button */}
          <button 
            className="btn btn--danger btn--block" 
            onClick={() => {
              setIsMenuOpen(false);
              logout();
            }}
            style={{ marginTop: '16px' }}
          >
            <LogOut size={18} />
            <span>{t('nav.logout')}</span>
          </button>
        </div>
      </Modal>
    </>
  );
};

export default BottomNav;
