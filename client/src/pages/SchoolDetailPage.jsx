import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getSchool, deleteSchool, createHM } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import Modal from '../components/Modal';
import WizardForm from '../components/WizardForm';
import DataTable from '../components/DataTable';
import { ArrowLeft, User, Phone, Trash2, Calendar, BookOpen, GraduationCap, Users } from 'lucide-react';

const SchoolDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isHMModalOpen, setIsHMModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchSchoolDetail = async () => {
    try {
      const data = await getSchool(id);
      setSchool(data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to fetch school details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchoolDetail();
  }, [id]);

  const handleDeleteSchool = async () => {
    if (window.confirm(t('schooldetail.delete.confirm'))) {
      try {
        await deleteSchool(id);
        navigate('/cluster/schools');
      } catch (err) {
        console.error(err);
        showToast('Failed to delete school', 'error');
      }
    }
  };

  const handleCreateHM = async (formData) => {
    try {
      await createHM(id, formData);
      showToast(t('schooldetail.hm.created'));
      setIsHMModalOpen(false);
      setLoading(true);
      fetchSchoolDetail();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Failed to create Headmaster account', 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="skeleton" style={{ height: '30px', width: '150px' }}></div>
        <div className="skeleton" style={{ height: '180px', borderRadius: '16px' }}></div>
        <div className="grid-2">
          <div className="skeleton" style={{ height: '250px', borderRadius: '16px' }}></div>
          <div className="skeleton" style={{ height: '250px', borderRadius: '16px' }}></div>
        </div>
      </div>
    );
  }

  if (error || !school) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px', borderColor: 'var(--danger)' }}>
        <p style={{ color: 'var(--danger)', marginBottom: '16px' }}>{error || 'School not found'}</p>
        <Link to="/cluster/schools" className="btn btn--secondary">
          <ArrowLeft size={16} /> {t('action.back')}
        </Link>
      </div>
    );
  }

  const metrics = school.school_metrics || {
    total_students: 0,
    male_students: 0,
    female_students: 0,
    uniform_distributed: 0,
    books_distributed: 0
  };

  const getLocalizedType = (type) => {
    switch (type) {
      case 'ZP': return t('type.zp');
      case 'Private Aided': return t('type.private_aided');
      case 'Private Un-Aided': return t('type.private_unaided');
      case 'Self Finance': return t('type.self_finance');
      default: return type;
    }
  };

  const teacherColumns = [
    { key: 'name', label: t('teachers.name') },
    { key: 'phone', label: t('teachers.number') },
    { 
      key: 'category', 
      label: t('teachers.category'),
      render: (val) => val ? t(`category.${val.toLowerCase()}`) : 'N/A'
    },
    { 
      key: 'designation', 
      label: t('teachers.designation'),
      render: (val) => {
        if (val === 'Assistant Teacher') return t('desig.assistant');
        if (val === 'Senior Teacher') return t('desig.senior');
        if (val === 'PET (Physical Education)') return t('desig.pet');
        if (val === 'Drawing Teacher') return t('desig.drawing');
        return val || t('desig.other');
      }
    },
    { key: 'doj', label: t('teachers.doj') },
    { key: 'tet', label: t('teachers.tet') }
  ];

  const hmWizardSteps = [
    {
      title: t('schooldetail.hm.create'),
      fields: [
        { 
          name: 'name', 
          label: language === 'en' ? 'HM Full Name' : 'मुख्याध्यापकाचे नाव', 
          type: 'text', 
          required: true, 
          placeholder: 'John Doe' 
        },
        { 
          name: 'phone', 
          label: t('login.phone'), 
          type: 'tel', 
          required: true, 
          placeholder: '10-digit number' 
        },
        { 
          name: 'password', 
          label: t('login.password'), 
          type: 'text', 
          required: true, 
          placeholder: 'Create password' 
        }
      ]
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {toast && (
        <div className="toast-container">
          <div className={`toast toast--${toast.type}`}>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <div>
        <Link to="/cluster/schools" className="btn btn--ghost btn--sm" style={{ marginBottom: '16px', paddingLeft: 0 }}>
          <ArrowLeft size={16} /> {t('action.back')}
        </Link>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <div>
            <h1 className="page-title">{school.name}</h1>
            <p className="page-subtitle">UDISE: {school.udise_code || 'N/A'} • {school.village_town || 'N/A'}</p>
          </div>
          <button className="btn btn--danger" onClick={handleDeleteSchool}>
            <Trash2 size={16} /> {t('action.delete')}
          </button>
        </div>
      </div>

      <div className="grid-3">
        {/* School Info */}
        <div className="card">
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} style={{ color: 'var(--accent-primary)' }} />
            {t('schooldetail.title')}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>{t('schools.type')}:</span>{' '}
              <span className="badge badge--accent">{getLocalizedType(school.school_type)}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>{t('schools.village')}:</span>{' '}
              <span>{school.village_town || 'N/A'}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>{t('schools.pincode')}:</span>{' '}
              <span>{school.pin_code || 'N/A'}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>{t('schools.address')}:</span>{' '}
              <span>{school.address || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* HM Section */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={18} style={{ color: 'var(--success)' }} />
            {t('schooldetail.hm.info')}
          </h3>
          {school.headmaster ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.95rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{language === 'en' ? 'HM Name' : 'मुख्याध्यापकाचे नाव'}</div>
                  <div style={{ fontWeight: 600 }}>{school.headmaster.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('login.phone')}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone size={14} style={{ color: 'var(--text-secondary)' }} />
                    <span>{school.headmaster.phone}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{language === 'en' ? 'Status' : 'स्थिती'}</div>
                  <span className="badge badge--success">{language === 'en' ? 'Active' : 'सक्रिय'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                {t('schooldetail.hm.none')}
              </p>
              <button className="btn btn--primary" onClick={() => setIsHMModalOpen(true)}>
                {t('schooldetail.hm.create')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* School Data Metric Cards */}
      <div className="card">
        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <GraduationCap size={18} style={{ color: 'var(--warning)' }} />
          {t('schooldata.title')}
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          <div className="card stats-card" style={{ padding: '12px', background: 'rgba(255,255,255,0.01)' }}>
            <div className="stats-card__content">
              <span className="stats-card__value">{metrics.total_students}</span>
              <span className="stats-card__label">{t('stats.students')}</span>
            </div>
          </div>

          <div className="card stats-card" style={{ padding: '12px', background: 'rgba(255,255,255,0.01)' }}>
            <div className="stats-card__content">
              <span className="stats-card__value" style={{ color: '#3b82f6' }}>{metrics.male_students}</span>
              <span className="stats-card__label">{t('stats.boys')}</span>
            </div>
          </div>

          <div className="card stats-card" style={{ padding: '12px', background: 'rgba(255,255,255,0.01)' }}>
            <div className="stats-card__content">
              <span className="stats-card__value" style={{ color: '#ec4899' }}>{metrics.female_students}</span>
              <span className="stats-card__label">{t('stats.girls')}</span>
            </div>
          </div>

          <div className="card stats-card" style={{ padding: '12px', background: 'rgba(255,255,255,0.01)' }}>
            <div className="stats-card__content">
              <span className="stats-card__value" style={{ color: '#10b981' }}>{metrics.uniform_distributed}</span>
              <span className="stats-card__label">{t('stats.uniforms')}</span>
            </div>
          </div>

          <div className="card stats-card" style={{ padding: '12px', background: 'rgba(255,255,255,0.01)' }}>
            <div className="stats-card__content">
              <span className="stats-card__value" style={{ color: '#f59e0b' }}>{metrics.books_distributed}</span>
              <span className="stats-card__label">{t('stats.books')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={18} style={{ color: 'var(--accent-primary)' }} />
          {t('schooldetail.teachers')} ({school.teachers?.length || 0})
        </h3>
        <DataTable
          columns={teacherColumns}
          data={school.teachers || []}
          emptyMessage={language === 'en' ? 'No teachers registered in this school yet.' : 'या शाळेत अद्याप शिक्षकांची नोंद नाही.'}
          emptyIcon={Users}
        />
      </div>

      <Modal isOpen={isHMModalOpen} onClose={() => setIsHMModalOpen(false)} title={t('schooldetail.hm.create')}>
        <WizardForm
          steps={hmWizardSteps}
          onSubmit={handleCreateHM}
          onCancel={() => setIsHMModalOpen(false)}
          submitLabel={t('schooldetail.hm.create')}
        />
      </Modal>
    </div>
  );
};

export default SchoolDetailPage;
