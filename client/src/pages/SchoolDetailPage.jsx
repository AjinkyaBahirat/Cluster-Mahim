import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getSchool, deleteSchool, createHM, createTeacher, updateTeacher, deleteTeacher, saveSchoolData } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import WizardForm from '../components/WizardForm';
import DataTable from '../components/DataTable';
import { ArrowLeft, User, Phone, Trash2, Calendar, BookOpen, GraduationCap, Users, Edit, Plus, Save, Camera, Building } from 'lucide-react';

const SchoolDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Master data entry states
  const [isHMModalOpen, setIsHMModalOpen] = useState(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [isMetricsModalOpen, setIsMetricsModalOpen] = useState(false);
  const [editSchoolData, setEditSchoolData] = useState(null);
  const [savingMetrics, setSavingMetrics] = useState(false);
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

  const handleOpenAddTeacher = () => {
    setEditingTeacher(null);
    setIsTeacherModalOpen(true);
  };

  const handleOpenEditTeacher = (teacher) => {
    setEditingTeacher(teacher);
    setIsTeacherModalOpen(true);
  };

  const handleDeleteTeacher = async (teacherId) => {
    if (window.confirm(t('teachers.delete.confirm'))) {
      try {
        await deleteTeacher(teacherId);
        showToast(t('teachers.deleted'));
        setLoading(true);
        fetchSchoolDetail();
      } catch (err) {
        console.error(err);
        showToast('Failed to delete teacher', 'error');
      }
    }
  };

  const handleSubmitTeacher = async (formData) => {
    try {
      if (editingTeacher) {
        await updateTeacher(editingTeacher.id, formData);
        showToast(t('teachers.updated'));
      } else {
        await createTeacher({ ...formData, school_id: id });
        showToast(t('teachers.added'));
      }
      setIsTeacherModalOpen(false);
      setLoading(true);
      fetchSchoolDetail();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Operation failed', 'error');
    }
  };

  const handleOpenEditMetrics = () => {
    setEditSchoolData({
      total_students: metrics.total_students || 0,
      male_students: metrics.male_students || 0,
      female_students: metrics.female_students || 0,
      uniform_distributed: metrics.uniform_distributed || 0,
      books_distributed: metrics.books_distributed || 0,
      cctv_available: metrics.cctv_available || 'no',
      toilets_available: metrics.toilets_available || 'no',
      holding_account_number: metrics.holding_account_number || ''
    });
    setIsMetricsModalOpen(true);
  };

  const handleUpdateMetricValue = (key, delta) => {
    setEditSchoolData(prev => {
      const currentVal = prev[key] || 0;
      const newVal = Math.max(0, currentVal + delta);
      const updated = { ...prev, [key]: newVal };
      if (key === 'male_students' || key === 'female_students') {
        updated.total_students = (updated.male_students || 0) + (updated.female_students || 0);
      }
      return updated;
    });
  };

  const handleDirectInputMetric = (key, value) => {
    const numVal = parseInt(value, 10);
    setEditSchoolData(prev => {
      const updated = { ...prev, [key]: isNaN(numVal) ? 0 : Math.max(0, numVal) };
      if (key === 'male_students' || key === 'female_students') {
        updated.total_students = (updated.male_students || 0) + (updated.female_students || 0);
      }
      return updated;
    });
  };

  const handleSaveMetrics = async () => {
    setSavingMetrics(true);
    try {
      await saveSchoolData({ ...editSchoolData, school_id: id });
      showToast(t('schooldata.saved'));
      setIsMetricsModalOpen(false);
      setLoading(true);
      fetchSchoolDetail();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Failed to save metrics', 'error');
    } finally {
      setSavingMetrics(false);
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

  const baseTeacherColumns = [
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

  const teacherColumns = user?.role === 'cluster' ? [
    ...baseTeacherColumns,
    {
      key: 'actions',
      label: language === 'en' ? 'Actions' : 'कृती',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn btn--secondary btn--sm" 
            style={{ padding: '6px 10px', minHeight: 'unset' }}
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEditTeacher(row);
            }}
            title={language === 'en' ? 'Edit' : 'सुधारा'}
          >
            <Edit size={14} />
          </button>
          <button 
            className="btn btn--danger btn--sm" 
            style={{ padding: '6px 10px', minHeight: 'unset' }}
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteTeacher(row.id);
            }}
            title={language === 'en' ? 'Delete' : 'काढून टाका'}
          >
            <Trash2 size={14} />
          </button>
        </div>
      )
    }
  ] : baseTeacherColumns;

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '16px' }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
            <GraduationCap size={18} style={{ color: 'var(--warning)' }} />
            {t('schooldata.title')}
          </h3>
          {user?.role === 'cluster' && (
            <button className="btn btn--secondary btn--sm" onClick={handleOpenEditMetrics} style={{ minHeight: 'unset', padding: '6px 12px' }}>
              <Edit size={14} /> {language === 'en' ? 'Edit Metrics' : 'माहिती सुधारा'}
            </button>
          )}
        </div>
        
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

        {/* Infrastructure & Account Info Summary */}
        <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', borderTop: '1px solid var(--border-glass)', paddingTop: '16px', fontSize: '0.9rem' }}>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>{language === 'en' ? 'CCTV Available' : 'सीसीटीव्ही उपलब्ध'}:</span>{' '}
            <span className={`badge ${metrics.cctv_available === 'yes' ? 'badge--success' : 'badge--danger'}`}>
              {metrics.cctv_available === 'yes' ? (language === 'en' ? 'Yes' : 'होय') : (language === 'en' ? 'No' : 'नाही')}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>{language === 'en' ? 'Toilets Available' : 'शौचालय उपलब्ध'}:</span>{' '}
            <span className={`badge ${metrics.toilets_available === 'yes' ? 'badge--success' : 'badge--danger'}`}>
              {metrics.toilets_available === 'yes' ? (language === 'en' ? 'Yes' : 'होय') : (language === 'en' ? 'No' : 'नाही')}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>{language === 'en' ? 'Holding Account Number' : 'होल्डिंग खाते क्रमांक'}:</span>{' '}
            <span style={{ fontWeight: 600 }}>{metrics.holding_account_number || 'N/A'}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '16px' }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
            <Users size={18} style={{ color: 'var(--accent-primary)' }} />
            {t('schooldetail.teachers')} ({school.teachers?.length || 0})
          </h3>
          {user?.role === 'cluster' && (
            <button className="btn btn--primary btn--sm" onClick={handleOpenAddTeacher} style={{ minHeight: 'unset', padding: '6px 12px' }}>
              <Plus size={14} /> {t('teachers.add')}
            </button>
          )}
        </div>
        <DataTable
          columns={teacherColumns}
          data={school.teachers || []}
          emptyMessage={language === 'en' ? 'No teachers registered in this school yet.' : 'या शाळेत अद्याप शिक्षकांची नोंद नाही.'}
          emptyIcon={Users}
        />
      </div>

      {/* HM Account Create Modal */}
      <Modal isOpen={isHMModalOpen} onClose={() => setIsHMModalOpen(false)} title={t('schooldetail.hm.create')}>
        <WizardForm
          steps={hmWizardSteps}
          onSubmit={handleCreateHM}
          onCancel={() => setIsHMModalOpen(false)}
          submitLabel={t('schooldetail.hm.create')}
        />
      </Modal>

      {/* Teacher Add/Edit Modal */}
      <Modal 
        isOpen={isTeacherModalOpen} 
        onClose={() => setIsTeacherModalOpen(false)} 
        title={editingTeacher ? (language === 'en' ? 'Edit Teacher' : 'शिक्षक माहिती सुधारा') : t('teachers.add')}
      >
        <WizardForm
          steps={[
            {
              title: language === 'en' ? 'Personal Info' : 'वैयक्तिक माहिती',
              fields: [
                {
                  name: 'name',
                  label: t('teachers.name'),
                  type: 'text',
                  required: true,
                  placeholder: 'e.g. Mrs. Anjali Sharma',
                  defaultValue: editingTeacher?.name || ''
                },
                {
                  name: 'phone',
                  label: t('teachers.number'),
                  type: 'tel',
                  placeholder: '10-digit mobile number',
                  defaultValue: editingTeacher?.phone || ''
                },
                {
                  name: 'category',
                  label: t('teachers.category'),
                  type: 'select',
                  required: true,
                  options: [
                    { value: 'General', label: t('category.general') },
                    { value: 'OBC', label: t('category.obc') },
                    { value: 'SC', label: t('category.sc') },
                    { value: 'ST', label: t('category.st') },
                    { value: 'NT', label: t('category.nt') },
                    { value: 'VJ', label: t('category.vj') }
                  ],
                  defaultValue: editingTeacher?.category || 'General'
                },
                {
                  name: 'dob',
                  label: t('teachers.dob'),
                  type: 'date',
                  required: true,
                  defaultValue: editingTeacher?.dob || ''
                }
              ]
            },
            {
              title: language === 'en' ? 'Service Details' : 'सेवा तपशील',
              fields: [
                {
                  name: 'designation',
                  label: t('teachers.designation'),
                  type: 'select',
                  required: true,
                  options: [
                    { value: 'Assistant Teacher', label: t('desig.assistant') },
                    { value: 'Senior Teacher', label: t('desig.senior') },
                    { value: 'PET (Physical Education)', label: t('desig.pet') },
                    { value: 'Drawing Teacher', label: t('desig.drawing') },
                    { value: 'Other', label: t('desig.other') }
                  ],
                  defaultValue: editingTeacher?.designation || 'Assistant Teacher'
                },
                {
                  name: 'doj',
                  label: t('teachers.doj'),
                  type: 'date',
                  required: true,
                  defaultValue: editingTeacher?.doj || ''
                },
                {
                  name: 'doj_this_school',
                  label: t('teachers.doj_this_school'),
                  type: 'date',
                  required: true,
                  defaultValue: editingTeacher?.doj_this_school || ''
                }
              ]
            },
            {
              title: language === 'en' ? 'Certifications' : 'पात्रता परीक्षा',
              fields: [
                {
                  name: 'tet',
                  label: t('teachers.tet'),
                  type: 'text',
                  placeholder: 'e.g. Qualified (Paper 1 & 2) / NA',
                  defaultValue: editingTeacher?.tet || ''
                },
                {
                  name: 'ctet_year',
                  label: t('teachers.ctet_year'),
                  type: 'text',
                  placeholder: 'e.g. 2021 / NA',
                  defaultValue: editingTeacher?.ctet_year || ''
                }
              ]
            }
          ]}
          onSubmit={handleSubmitTeacher}
          onCancel={() => setIsTeacherModalOpen(false)}
          submitLabel={editingTeacher ? (language === 'en' ? 'Save Changes' : 'बदल जतन करा') : t('teachers.add')}
        />
      </Modal>

      {/* Metrics Edit Modal */}
      <Modal
        isOpen={isMetricsModalOpen}
        onClose={() => setIsMetricsModalOpen(false)}
        title={language === 'en' ? 'Edit School Data Metrics' : 'शाळेची आकडेवारी सुधारा'}
      >
        {editSchoolData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Male Students */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{t('schooldata.student.male')}</span>
              <div className="stepper" style={{ margin: 0 }}>
                <button type="button" className="stepper__btn" onClick={() => handleUpdateMetricValue('male_students', -1)}>-</button>
                <input 
                  type="number" 
                  className="form-input" 
                  value={editSchoolData.male_students} 
                  onChange={(e) => handleDirectInputMetric('male_students', e.target.value)} 
                  style={{ width: '80px', textAlign: 'center', padding: '8px 4px', fontSize: '1.1rem', fontWeight: 600, minHeight: 'unset' }}
                />
                <button type="button" className="stepper__btn" onClick={() => handleUpdateMetricValue('male_students', 1)}>+</button>
              </div>
            </div>

            {/* Female Students */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{t('schooldata.student.female')}</span>
              <div className="stepper" style={{ margin: 0 }}>
                <button type="button" className="stepper__btn" onClick={() => handleUpdateMetricValue('female_students', -1)}>-</button>
                <input 
                  type="number" 
                  className="form-input" 
                  value={editSchoolData.female_students} 
                  onChange={(e) => handleDirectInputMetric('female_students', e.target.value)} 
                  style={{ width: '80px', textAlign: 'center', padding: '8px 4px', fontSize: '1.1rem', fontWeight: 600, minHeight: 'unset' }}
                />
                <button type="button" className="stepper__btn" onClick={() => handleUpdateMetricValue('female_students', 1)}>+</button>
              </div>
            </div>

            {/* Uniforms */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{t('schooldata.uniform.distributed')}</span>
              <div className="stepper" style={{ margin: 0 }}>
                <button type="button" className="stepper__btn" onClick={() => handleUpdateMetricValue('uniform_distributed', -1)}>-</button>
                <input 
                  type="number" 
                  className="form-input" 
                  value={editSchoolData.uniform_distributed} 
                  onChange={(e) => handleDirectInputMetric('uniform_distributed', e.target.value)} 
                  style={{ width: '80px', textAlign: 'center', padding: '8px 4px', fontSize: '1.1rem', fontWeight: 600, minHeight: 'unset' }}
                />
                <button type="button" className="stepper__btn" onClick={() => handleUpdateMetricValue('uniform_distributed', 1)}>+</button>
              </div>
            </div>

            {/* Books */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{t('schooldata.books.distributed')}</span>
              <div className="stepper" style={{ margin: 0 }}>
                <button type="button" className="stepper__btn" onClick={() => handleUpdateMetricValue('books_distributed', -1)}>-</button>
                <input 
                  type="number" 
                  className="form-input" 
                  value={editSchoolData.books_distributed} 
                  onChange={(e) => handleDirectInputMetric('books_distributed', e.target.value)} 
                  style={{ width: '80px', textAlign: 'center', padding: '8px 4px', fontSize: '1.1rem', fontWeight: 600, minHeight: 'unset' }}
                />
                <button type="button" className="stepper__btn" onClick={() => handleUpdateMetricValue('books_distributed', 1)}>+</button>
              </div>
            </div>

            {/* CCTV Switch */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{language === 'en' ? 'CCTV Available' : 'सीसीटीव्ही उपलब्ध'}</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => setEditSchoolData(prev => ({ ...prev, cctv_available: 'yes' }))}
                  className={`btn btn--sm ${editSchoolData.cctv_available === 'yes' ? 'btn--primary' : 'btn--secondary'}`}
                  style={{ minHeight: 'unset', padding: '6px 12px' }}
                >
                  {language === 'en' ? 'Yes' : 'होय'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setEditSchoolData(prev => ({ ...prev, cctv_available: 'no' }))}
                  className={`btn btn--sm ${editSchoolData.cctv_available === 'no' ? 'btn--primary' : 'btn--secondary'}`}
                  style={{ minHeight: 'unset', padding: '6px 12px' }}
                >
                  {language === 'en' ? 'No' : 'नाही'}
                </button>
              </div>
            </div>

            {/* Toilet Switch */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{language === 'en' ? 'Toilets Available' : 'शौचालय उपलब्ध'}</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => setEditSchoolData(prev => ({ ...prev, toilets_available: 'yes' }))}
                  className={`btn btn--sm ${editSchoolData.toilets_available === 'yes' ? 'btn--primary' : 'btn--secondary'}`}
                  style={{ minHeight: 'unset', padding: '6px 12px' }}
                >
                  {language === 'en' ? 'Yes' : 'होय'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setEditSchoolData(prev => ({ ...prev, toilets_available: 'no' }))}
                  className={`btn btn--sm ${editSchoolData.toilets_available === 'no' ? 'btn--primary' : 'btn--secondary'}`}
                  style={{ minHeight: 'unset', padding: '6px 12px' }}
                >
                  {language === 'en' ? 'No' : 'नाही'}
                </button>
              </div>
            </div>

            {/* Holding Account Number */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">{language === 'en' ? 'Holding Account Number' : 'होल्डिंग खाते क्रमांक'}</label>
              <input 
                type="text" 
                className="form-input" 
                value={editSchoolData.holding_account_number || ''} 
                onChange={(e) => setEditSchoolData(prev => ({ ...prev, holding_account_number: e.target.value }))}
                placeholder={language === 'en' ? 'Enter bank account number' : 'खाते क्रमांक टाका'}
              />
            </div>

            {/* Save Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn--secondary" onClick={() => setIsMetricsModalOpen(false)}>
                {language === 'en' ? 'Cancel' : 'रद्द करा'}
              </button>
              <button type="button" className="btn btn--primary" onClick={handleSaveMetrics} disabled={savingMetrics}>
                {savingMetrics ? <div className="spinner"></div> : <><Save size={16} /> {t('action.save')}</>}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SchoolDetailPage;
