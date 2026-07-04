import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getSchools, getSchoolDataSummary } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import StatsCard from '../components/StatsCard';
import { School, Users, GraduationCap, UserPlus, Eye, Plus, ArrowRight, ClipboardList, FileSpreadsheet, Megaphone } from 'lucide-react';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const ClusterDashboard = () => {
  const { t, language } = useLanguage();
  const [schools, setSchools] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [schoolsData, summary] = await Promise.all([
          getSchools(),
          getSchoolDataSummary()
        ]);
        setSchools(schoolsData);
        setSummaryData(summary);
      } catch (err) {
        console.error('Error fetching dashboard data', err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="skeleton" style={{ height: '40px', width: '250px' }}></div>
        <div className="stats-grid">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="skeleton" style={{ height: '100px', borderRadius: '12px' }}></div>
          ))}
        </div>
        <div className="grid-2">
          <div className="skeleton" style={{ height: '300px', borderRadius: '16px' }}></div>
          <div className="skeleton" style={{ height: '300px', borderRadius: '16px' }}></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px', borderColor: 'var(--danger)' }}>
        <p style={{ color: 'var(--danger)', fontSize: '1.1rem', marginBottom: '16px' }}>{error}</p>
        <button className="btn btn--secondary" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  // Calculate statistics
  const totalSchools = schools.length;
  const totalTeachers = schools.reduce((sum, s) => sum + (s.teacher_count || 0), 0);
  const totalStudents = summaryData?.summary?.total_students || 0;
  const totalHMs = schools.filter((s) => s.has_hm).length;

  // Recent schools (up to 5)
  const recentSchools = [...schools]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  // Chart Data: Students per School
  const barChartData = {
    labels: schools.map((s) => s.name),
    datasets: [
      {
        label: t('stats.students'),
        data: schools.map((s) => s.student_count || 0),
        backgroundColor: 'rgba(108, 92, 231, 0.75)',
        borderColor: '#6c5ce7',
        borderWidth: 1,
        borderRadius: 6
      }
    ]
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f0f1c',
        titleColor: '#f8f9fa',
        bodyColor: '#a0aec0',
        borderColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#a0aec0' }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#a0aec0' }
      }
    }
  };

  // Chart Data: Gender distribution
  const totalBoys = summaryData?.summary?.total_boys || 0;
  const totalGirls = summaryData?.summary?.total_girls || 0;

  const doughnutChartData = {
    labels: [t('stats.boys'), t('stats.girls')],
    datasets: [
      {
        data: [totalBoys, totalGirls],
        backgroundColor: ['#3b82f6', '#ec4899'],
        borderColor: 'rgba(15, 15, 28, 0.8)',
        borderWidth: 2
      }
    ]
  };

  const doughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#a0aec0', padding: 20 }
      },
      tooltip: {
        backgroundColor: '#0f0f1c',
        titleColor: '#f8f9fa',
        bodyColor: '#a0aec0',
        borderColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('nav.dashboard')}</h1>
          <p className="page-subtitle">{language === 'en' ? 'Aggregate data and tracking for the school cluster' : 'शाळा समूहाची एकत्रित आकडेवारी आणि ट्रॅकिंग'}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link to="/cluster/schools" className="btn btn--primary">
            <Plus size={18} /> {t('schools.add')}
          </Link>
        </div>
      </div>

      <div className="stats-grid">
        <StatsCard icon={School} label={t('stats.schools')} value={totalSchools} color="#6c5ce7" />
        <StatsCard icon={Users} label={t('stats.teachers')} value={totalTeachers} color="#10b981" />
        <StatsCard icon={GraduationCap} label={t('stats.students')} value={totalStudents} color="#f59e0b" />
        <StatsCard icon={UserPlus} label={t('stats.hms')} value={`${totalHMs}/${totalSchools}`} color="#3b82f6" />
      </div>

      {/* Mobile Navigation Grid */}
      <div className="mobile-nav-grid">
        <Link to="/cluster/schools" className="card hover-lift" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', textAlign: 'center', gap: '12px' }}>
          <div className="stats-card__icon-wrap" style={{ width: '48px', height: '48px', margin: 0, borderColor: 'rgba(108, 92, 231, 0.2)', background: 'rgba(108, 92, 231, 0.08)' }}>
            <School size={22} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{t('nav.schools')}</span>
        </Link>
        
        <Link to="/cluster/forms" className="card hover-lift" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', textAlign: 'center', gap: '12px' }}>
          <div className="stats-card__icon-wrap" style={{ width: '48px', height: '48px', margin: 0, background: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
            <ClipboardList size={22} style={{ color: 'var(--success)' }} />
          </div>
          <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{language === 'en' ? 'Forms & Surveys' : 'फॉर्म व सर्वेक्षण'}</span>
        </Link>

        <Link to="/cluster/announcements" className="card hover-lift" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', textAlign: 'center', gap: '12px' }}>
          <div className="stats-card__icon-wrap" style={{ width: '48px', height: '48px', margin: 0, background: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.2)' }}>
            <Megaphone size={22} style={{ color: 'var(--warning)' }} />
          </div>
          <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{language === 'en' ? 'Notices' : 'सूचना व परिपत्रके'}</span>
        </Link>

        <Link to="/cluster/excel" className="card hover-lift" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', textAlign: 'center', gap: '12px' }}>
          <div className="stats-card__icon-wrap" style={{ width: '48px', height: '48px', margin: 0, background: 'rgba(59, 130, 246, 0.08)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
            <FileSpreadsheet size={22} style={{ color: 'var(--info)' }} />
          </div>
          <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{language === 'en' ? 'Excel Sheets' : 'एक्सेल अहवाल'}</span>
        </Link>
      </div>

      {totalSchools > 0 ? (
        <>
          <div className="grid-2">
            <div className="card">
              <h3 className="card-title">{language === 'en' ? 'Student Distribution per School' : 'शाळानिहाय विद्यार्थी संख्या वितरण'}</h3>
              <div style={{ height: '280px', position: 'relative' }}>
                <Bar data={barChartData} options={barChartOptions} />
              </div>
            </div>

            <div className="card">
              <h3 className="card-title">{language === 'en' ? 'Overall Gender Split' : 'एकूण मुले-मुलींचे प्रमाण'}</h3>
              <div style={{ height: '280px', position: 'relative' }}>
                <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 className="card-title" style={{ marginBottom: 0 }}>{language === 'en' ? 'Recent Schools Added' : 'नुकत्याच जोडलेल्या शाळा'}</h3>
              <Link to="/cluster/schools" className="btn btn--ghost btn--sm">
                {t('action.view')} {language === 'en' ? 'All' : 'सर्व'} <ArrowRight size={14} />
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentSchools.map((school) => (
                <div 
                  key={school.id} 
                  className="card card--accent" 
                  style={{ 
                    padding: '16px', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center' 
                  }}
                >
                  <div>
                    <h4 style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: '4px' }}>{school.name}</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      UDISE: {school.udise_code || 'N/A'} • {school.village_town || 'N/A'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{school.student_count || 0}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('stats.students')}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{school.teacher_count || 0}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('stats.teachers')}</div>
                    </div>
                    <Link to={`/cluster/schools/${school.id}`} className="btn btn--secondary btn--sm">
                      <Eye size={14} /> {t('action.view')}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '64px' }}>
          <School size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <h3 style={{ marginBottom: '8px' }}>{language === 'en' ? 'No schools added yet' : 'अद्याप एकही शाळा जोडलेली नाही'}</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '450px', margin: '0 auto 24px' }}>
            {language === 'en' 
              ? 'Get started by adding schools in your cluster. Once added, you can assign Headmasters and monitor their metrics.'
              : 'तुमच्या समूहामध्ये शाळा जोडून सुरुवात करा. शाळा जोडल्यावर तुम्ही मुख्याध्यापक नियुक्त करून आकडेवारी पाहू शकता.'}
          </p>
          <Link to="/cluster/schools" className="btn btn--primary">
            <Plus size={18} /> {language === 'en' ? 'Add Your First School' : 'पहिली शाळा जोडा'}
          </Link>
        </div>
      )}
    </div>
  );
};

export default ClusterDashboard;
