import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getTeachers, getSchoolData } from '../utils/api';
import StatsCard from '../components/StatsCard';
import { Users, GraduationCap, ClipboardList, Megaphone, FileSpreadsheet, ArrowRight } from 'lucide-react';

const HMDashboard = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [teachersCount, setTeachersCount] = useState(0);
  const [schoolData, setSchoolData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHMData = async () => {
      try {
        const [teachers, sData] = await Promise.all([
          getTeachers(),
          getSchoolData()
        ]);
        setTeachersCount(teachers.length);
        setSchoolData(sData);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchHMData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="skeleton" style={{ height: '40px', width: '300px' }}></div>
        <div className="stats-grid">
          {[1, 2, 3].map((n) => (
            <div key={n} className="skeleton" style={{ height: '100px', borderRadius: '12px' }}></div>
          ))}
        </div>
        <div className="skeleton" style={{ height: '350px', borderRadius: '16px' }}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px', borderColor: 'var(--danger)' }}>
        <p style={{ color: 'var(--danger)', marginBottom: '16px' }}>{error}</p>
        <button className="btn btn--secondary" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  const totalStudents = schoolData ? (schoolData.total_students || 0) : 0;
  const totalBoys = schoolData ? (schoolData.male_students || 0) : 0;
  const totalGirls = schoolData ? (schoolData.female_students || 0) : 0;
  const uniforms = schoolData ? (schoolData.uniform_distributed || 0) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title">{t('nav.dashboard')}</h1>
          <p className="page-subtitle">{language === 'en' ? `Welcome back, HM of ${user?.school_name}` : `स्वागत आहे, ${user?.school_name} चे मुख्याध्यापक`}</p>
        </div>
        <span className="badge badge--success" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
          🏫 {user?.school_name}
        </span>
      </div>

      <div className="stats-grid">
        <StatsCard icon={Users} label={t('stats.teachers')} value={teachersCount} color="#6c5ce7" />
        <StatsCard icon={GraduationCap} label={t('stats.students')} value={totalStudents} color="#10b981" />
        <StatsCard icon={ClipboardList} label={t('stats.uniforms')} value={uniforms} color="#f59e0b" />
      </div>

      <div className="grid-2">
        <Link to="/hm/teachers" className="card" style={{ textDecoration: 'none', display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div className="stats-card__icon-wrap" style={{ borderColor: 'rgba(108, 92, 231, 0.2)', background: 'rgba(108, 92, 231, 0.08)' }}>
            <Users size={24} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{t('nav.teachers')}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{language === 'en' ? 'Add, edit, or delete teaching staff records' : 'शिक्षकांची माहिती व नोंदी व्यवस्थापित करा'}</p>
          </div>
          <ArrowRight size={20} style={{ color: 'var(--text-muted)' }} />
        </Link>

        <Link to="/hm/school-data" className="card" style={{ textDecoration: 'none', display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div className="stats-card__icon-wrap" style={{ borderColor: 'rgba(16, 185, 129, 0.2)', background: 'rgba(16, 185, 129, 0.08)' }}>
            <GraduationCap size={24} style={{ color: 'var(--success)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{t('nav.schooldata')}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{language === 'en' ? 'Update boys & girls counts, uniform & books distribution' : 'पटसंख्या, गणवेश व पुस्तके वितरण माहिती भरा'}</p>
          </div>
          <ArrowRight size={20} style={{ color: 'var(--text-muted)' }} />
        </Link>

        <Link to="/hm/forms" className="card" style={{ textDecoration: 'none', display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div className="stats-card__icon-wrap" style={{ borderColor: 'rgba(245, 158, 11, 0.2)', background: 'rgba(245, 158, 11, 0.08)' }}>
            <ClipboardList size={24} style={{ color: 'var(--warning)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{t('nav.forms')}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{language === 'en' ? 'Fill forms and questionnaires requested by cluster' : 'क्लस्टरकडून मागवलेली सर्वेक्षणे आणि माहिती भरा'}</p>
          </div>
          <ArrowRight size={20} style={{ color: 'var(--text-muted)' }} />
        </Link>

        <Link to="/hm/announcements" className="card" style={{ textDecoration: 'none', display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div className="stats-card__icon-wrap" style={{ borderColor: 'rgba(59, 130, 246, 0.2)', background: 'rgba(59, 130, 246, 0.08)' }}>
            <Megaphone size={24} style={{ color: 'var(--info)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{t('nav.announcements')}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{language === 'en' ? 'View announcements and download circular PDFs' : 'नवीन सूचना व शासकीय परिपत्रके पहा किंवा डाउनलोड करा'}</p>
          </div>
          <ArrowRight size={20} style={{ color: 'var(--text-muted)' }} />
        </Link>
      </div>

      <div className="card" style={{ display: 'flex', gap: '20px', flexDirection: 'column' }}>
        <h3 className="card-title">{language === 'en' ? 'Enrollment Statistics Summary' : 'पटसंख्या आकडेवारी गोषवारा'}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', textAlign: 'center' }}>
          <div className="card" style={{ background: 'rgba(255,255,255,0.01)' }}>
            <h4 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px' }}>{t('stats.students')}</h4>
            <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{totalStudents}</div>
          </div>
          <div className="card" style={{ background: 'rgba(255,255,255,0.01)' }}>
            <h4 style={{ color: '#3b82f6', fontSize: '0.85rem', marginBottom: '8px' }}>{t('stats.boys')}</h4>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#3b82f6' }}>{totalBoys}</div>
          </div>
          <div className="card" style={{ background: 'rgba(255,255,255,0.01)' }}>
            <h4 style={{ color: '#ec4899', fontSize: '0.85rem', marginBottom: '8px' }}>{t('stats.girls')}</h4>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#ec4899' }}>{totalGirls}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HMDashboard;
