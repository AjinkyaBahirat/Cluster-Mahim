import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { 
  LayoutDashboard, 
  School, 
  Users, 
  GraduationCap, 
  ClipboardList, 
  Megaphone, 
  FileSpreadsheet, 
  LogOut, 
  Menu, 
  X, 
  Globe,
  Sun,
  Moon
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);

  const clusterLinks = [
    { to: '/cluster', label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/cluster/schools', label: t('nav.schools'), icon: School },
    { to: '/cluster/forms', label: t('nav.forms'), icon: ClipboardList },
    { to: '/cluster/announcements', label: t('nav.announcements'), icon: Megaphone },
    { to: '/cluster/excel', label: t('nav.excel'), icon: FileSpreadsheet },
  ];

  const hmLinks = [
    { to: '/hm', label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/hm/teachers', label: t('nav.teachers'), icon: Users },
    { to: '/hm/school-data', label: t('nav.schooldata'), icon: GraduationCap },
    { to: '/hm/forms', label: t('nav.forms'), icon: ClipboardList },
    { to: '/hm/announcements', label: t('nav.announcements'), icon: Megaphone },
    { to: '/hm/excel', label: t('nav.excel'), icon: FileSpreadsheet },
  ];

  const links = user?.role === 'cluster' ? clusterLinks : hmLinks;

  return (
    <>
      <button className="sidebar__toggle" onClick={toggleSidebar} aria-label="Toggle Navigation">
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar__logo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span>🏫 {language === 'en' ? 'Mahim' : 'महिम'}</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button 
              onClick={toggleTheme} 
              className="btn btn--ghost btn--sm" 
              style={{ padding: '4px 6px', minHeight: 'unset' }}
              title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button 
              onClick={toggleLanguage} 
              className="btn btn--secondary btn--sm" 
              style={{ padding: '4px 8px', fontSize: '0.8rem', minHeight: 'unset', display: 'flex', alignItems: 'center', gap: '4px' }}
              title={language === 'en' ? 'मराठी' : 'English'}
            >
              <Globe size={12} />
              <span>{language === 'en' ? 'मराठी' : 'EN'}</span>
            </button>
          </div>
        </div>

        <nav className="sidebar__nav">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to || (link.to !== '/cluster' && link.to !== '/hm' && location.pathname.startsWith(link.to));
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''}`}
                onClick={closeSidebar}
              >
                <Icon size={20} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar__user">
          <div className="sidebar__user-info" style={{ flex: 1 }}>
            <span className="sidebar__user-name">{user?.name}</span>
            <span className="sidebar__user-role">
              {user?.role === 'cluster' ? t('role.cluster') : user?.school_name || t('role.hm')}
            </span>
          </div>
          <button className="btn btn--ghost btn--sm" onClick={logout} title={t('nav.logout')}>
            <LogOut size={18} />
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
