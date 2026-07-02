import React, { useState, useEffect } from 'react';
import { getSchoolData, saveSchoolData, getForms, getForm, submitFormResponse } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { Save, AlertCircle, Check, ClipboardList, HelpCircle, Camera, Building } from 'lucide-react';

const StudentRecordsPage = () => {
  const { t, language } = useLanguage();
  const [schoolData, setSchoolData] = useState({
    total_students: 0,
    male_students: 0,
    female_students: 0,
    uniform_distributed: 0,
    books_distributed: 0,
    cctv_available: 'no',
    toilets_available: 'no',
    holding_account_number: ''
  });
  const [activeForms, setActiveForms] = useState([]);
  const [selectedForm, setSelectedForm] = useState(null);
  const [formQuestions, setFormQuestions] = useState([]);
  const [formAnswers, setFormAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    try {
      const [sData, forms] = await Promise.all([
        getSchoolData(),
        getForms()
      ]);
      
      setSchoolData({
        total_students: sData.total_students || 0,
        male_students: sData.male_students || 0,
        female_students: sData.female_students || 0,
        uniform_distributed: sData.uniform_distributed || 0,
        books_distributed: sData.books_distributed || 0,
        cctv_available: sData.cctv_available || 'no',
        toilets_available: sData.toilets_available || 'no',
        holding_account_number: sData.holding_account_number || ''
      });
      setActiveForms(forms);
      
      if (forms.length > 0) {
        handleLoadForm(forms[0].id);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch school details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLoadForm = async (formId) => {
    try {
      const data = await getForm(formId);
      setFormQuestions(data.questions || []);
      
      const initialAnswers = {};
      data.questions?.forEach(q => {
        const resp = data.responses?.find(r => r.question_id === q.id);
        initialAnswers[q.id] = resp ? resp.response_value : (q.question_type === 'yes_no' ? 'no' : '');
      });
      setFormAnswers(initialAnswers);
      const selected = activeForms.find(f => f.id === formId);
      setSelectedForm(selected);
    } catch (err) {
      console.error('Error loading form:', err);
      showToast('Failed to load survey questions', 'error');
    }
  };

  const handleUpdateSchoolMetric = (key, delta) => {
    setSchoolData((prev) => {
      const currentVal = prev[key] || 0;
      const newVal = Math.max(0, currentVal + delta);
      const updated = { ...prev, [key]: newVal };
      
      if (key === 'male_students' || key === 'female_students') {
        updated.total_students = (updated.male_students || 0) + (updated.female_students || 0);
      }
      return updated;
    });
    setHasChanges(true);
  };

  const handleDirectInput = (key, value) => {
    const numVal = parseInt(value, 10);
    setSchoolData((prev) => {
      const updated = { ...prev, [key]: isNaN(numVal) ? 0 : Math.max(0, numVal) };
      if (key === 'male_students' || key === 'female_students') {
        updated.total_students = (updated.male_students || 0) + (updated.female_students || 0);
      }
      return updated;
    });
    setHasChanges(true);
  };

  const handleToggleField = (key) => {
    setSchoolData((prev) => ({
      ...prev,
      [key]: prev[key] === 'yes' ? 'no' : 'yes'
    }));
    setHasChanges(true);
  };

  const handleTextInput = (key, value) => {
    setSchoolData((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSaveSchoolData = async () => {
    setSaving(true);
    try {
      await saveSchoolData(schoolData);
      showToast(t('schooldata.saved'));
      setHasChanges(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to save school metrics', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSurveyChange = (qId, value) => {
    setFormAnswers(prev => ({
      ...prev,
      [qId]: value
    }));
  };

  const handleSurveySubmit = async (e) => {
    e.preventDefault();
    if (!selectedForm) return;

    const missing = formQuestions.some(q => q.is_required && !formAnswers[q.id] && formAnswers[q.id] !== 0);
    if (missing) {
      showToast(language === 'en' ? 'Please answer all required questions' : 'कृपया सर्व अनिवार्य प्रश्नांची उत्तरे द्या', 'error');
      return;
    }

    try {
      const payload = Object.keys(formAnswers).map(qId => ({
        question_id: parseInt(qId, 10),
        response_value: formAnswers[qId]
      }));

      await submitFormResponse(selectedForm.id, payload);
      showToast(t('forms.responses.saved'));
      
      const forms = await getForms();
      setActiveForms(forms);
      const updatedSelected = forms.find(f => f.id === selectedForm.id);
      setSelectedForm(updatedSelected);
    } catch (err) {
      console.error(err);
      showToast('Failed to submit survey responses', 'error');
    }
  };

  // Render a number metric card with BOTH stepper and direct input
  const renderMetricCard = (label, key, color) => (
    <div className="card student-card">
      <div className="student-card__standard">{label}</div>
      <div className="student-card__total" style={{ color }}>{schoolData[key] || 0}</div>
      <div className="stepper">
        <button
          type="button"
          className="stepper__btn"
          onClick={() => handleUpdateSchoolMetric(key, -1)}
        >
          -
        </button>
        <input
          type="number"
          className="form-input"
          value={schoolData[key] || 0}
          onChange={(e) => handleDirectInput(key, e.target.value)}
          style={{
            width: '80px',
            textAlign: 'center',
            padding: '8px 4px',
            fontSize: '1.1rem',
            fontWeight: 600,
            minHeight: 'unset'
          }}
          min="0"
        />
        <button
          type="button"
          className="stepper__btn"
          onClick={() => handleUpdateSchoolMetric(key, 1)}
        >
          +
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="skeleton" style={{ height: '40px', width: '250px' }}></div>
        <div className="grid-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="skeleton" style={{ height: '180px', borderRadius: '16px' }}></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px', borderColor: 'var(--danger)' }}>
        <p style={{ color: 'var(--danger)' }}>{error}</p>
        <button className="btn btn--secondary" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', paddingBottom: '100px' }}>
      {toast && (
        <div className="toast-container">
          <div className={`toast toast--${toast.type}`}>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title">{t('nav.schooldata')}</h1>
          <p className="page-subtitle">{t('schooldata.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {hasChanges ? (
            <span className="badge badge--warning" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AlertCircle size={14} /> {t('schooldata.unsaved')}
            </span>
          ) : (
            <span className="badge badge--success" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Check size={14} /> {t('schooldata.allsaved')}
            </span>
          )}
        </div>
      </div>

      {/* Numerical Metrics Section */}
      <div className="student-grid">
        {renderMetricCard(t('schooldata.student.male'), 'male_students', '#3b82f6')}
        {renderMetricCard(t('schooldata.student.female'), 'female_students', '#ec4899')}
        {renderMetricCard(t('schooldata.uniform.distributed'), 'uniform_distributed', '#10b981')}
        {renderMetricCard(t('schooldata.books.distributed'), 'books_distributed', '#f59e0b')}
      </div>

      {/* CCTV, Toilets, Holding Account Section */}
      <div className="card">
        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <Building size={20} style={{ color: 'var(--accent-primary)' }} />
          {language === 'en' ? 'Infrastructure & Account Details' : 'पायाभूत सुविधा आणि खाते तपशील'}
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {/* CCTV Available */}
          <div className="card" style={{ padding: '20px', background: 'rgba(255,255,255,0.01)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Camera size={20} style={{ color: 'var(--info)' }} />
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                {language === 'en' ? 'CCTV Available' : 'सीसीटीव्ही उपलब्ध'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => handleToggleField('cctv_available')}
                className={`btn btn--sm ${schoolData.cctv_available === 'yes' ? 'btn--primary' : 'btn--secondary'}`}
                style={{ flex: 1 }}
              >
                {language === 'en' ? '✓ Yes' : '✓ होय'}
              </button>
              <button
                type="button"
                onClick={() => { setSchoolData(prev => ({ ...prev, cctv_available: 'no' })); setHasChanges(true); }}
                className={`btn btn--sm ${schoolData.cctv_available === 'no' ? 'btn--primary' : 'btn--secondary'}`}
                style={{ flex: 1 }}
              >
                {language === 'en' ? '✗ No' : '✗ नाही'}
              </button>
            </div>
          </div>

          {/* Toilets Available */}
          <div className="card" style={{ padding: '20px', background: 'rgba(255,255,255,0.01)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Building size={20} style={{ color: '#10b981' }} />
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                {language === 'en' ? 'Toilets Available' : 'शौचालय उपलब्ध'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => handleToggleField('toilets_available')}
                className={`btn btn--sm ${schoolData.toilets_available === 'yes' ? 'btn--primary' : 'btn--secondary'}`}
                style={{ flex: 1 }}
              >
                {language === 'en' ? '✓ Yes' : '✓ होय'}
              </button>
              <button
                type="button"
                onClick={() => { setSchoolData(prev => ({ ...prev, toilets_available: 'no' })); setHasChanges(true); }}
                className={`btn btn--sm ${schoolData.toilets_available === 'no' ? 'btn--primary' : 'btn--secondary'}`}
                style={{ flex: 1 }}
              >
                {language === 'en' ? '✗ No' : '✗ नाही'}
              </button>
            </div>
          </div>

          {/* Holding Account Number */}
          <div className="card" style={{ padding: '20px', background: 'rgba(255,255,255,0.01)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ fontSize: '1.2rem' }}>🏦</span>
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                {language === 'en' ? 'Holding Account Number' : 'होल्डिंग खाते क्रमांक'}
              </span>
            </div>
            <input
              type="text"
              className="form-input"
              value={schoolData.holding_account_number || ''}
              onChange={(e) => handleTextInput('holding_account_number', e.target.value)}
              placeholder={language === 'en' ? 'Enter account number' : 'खाते क्रमांक टाका'}
              style={{ fontSize: '1rem' }}
            />
          </div>
        </div>
      </div>

      {/* Dynamic Forms / Surveys Section */}
      <div className="card">
        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ClipboardList size={20} style={{ color: 'var(--accent-primary)' }} />
          {t('schooldata.survey')}
        </h3>

        {activeForms.length > 0 ? (
          <div className="grid-3" style={{ gridTemplateColumns: '220px 1fr', alignItems: 'start' }}>
            {/* Form list Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activeForms.map((form) => (
                <button
                  key={form.id}
                  onClick={() => handleLoadForm(form.id)}
                  className={`btn btn--secondary btn--block`}
                  style={{
                    justifyContent: 'space-between',
                    borderColor: selectedForm?.id === form.id ? 'var(--accent-primary)' : 'var(--border-glass)',
                    background: selectedForm?.id === form.id ? 'var(--accent-glow)' : 'transparent',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {language === 'en' ? form.title : (form.title_mr || form.title)}
                  </span>
                  <span className={`badge ${form.has_responded ? 'badge--success' : 'badge--warning'}`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                    {form.has_responded ? (language === 'en' ? 'Done' : 'पूर्ण') : (language === 'en' ? 'Pending' : 'बाकी')}
                  </span>
                </button>
              ))}
            </div>

            {/* Questions Render Form */}
            {selectedForm && (
              <div className="card" style={{ background: 'rgba(255,255,255,0.01)' }}>
                <h4 style={{ marginBottom: '4px', fontSize: '1.2rem' }}>
                  {language === 'en' ? selectedForm.title : (selectedForm.title_mr || selectedForm.title)}
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>
                  {language === 'en' ? selectedForm.description : (selectedForm.description_mr || selectedForm.description)}
                </p>

                {formQuestions.length > 0 ? (
                  <form onSubmit={handleSurveySubmit}>
                    {formQuestions.map((q) => (
                      <div key={q.id} className="form-group">
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {language === 'en' ? q.question_text : (q.question_text_mr || q.question_text)}
                          {q.is_required && <span style={{ color: 'var(--danger)' }}>*</span>}
                        </label>

                        {q.question_type === 'yes_no' ? (
                          <div style={{ display: 'flex', gap: '16px' }}>
                            <button
                              type="button"
                              onClick={() => handleSurveyChange(q.id, 'yes')}
                              className={`btn btn--sm ${formAnswers[q.id] === 'yes' ? 'btn--primary' : 'btn--secondary'}`}
                            >
                              {language === 'en' ? 'Yes' : 'होय'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSurveyChange(q.id, 'no')}
                              className={`btn btn--sm ${formAnswers[q.id] === 'no' || !formAnswers[q.id] ? 'btn--primary' : 'btn--secondary'}`}
                            >
                              {language === 'en' ? 'No' : 'नाही'}
                            </button>
                          </div>
                        ) : q.question_type === 'number' ? (
                          <div className="stepper" style={{ margin: '0' }}>
                            <button
                              type="button"
                              className="stepper__btn"
                              onClick={() => handleSurveyChange(q.id, Math.max(0, (Number(formAnswers[q.id]) || 0) - 1))}
                            >
                              -
                            </button>
                            <input
                              type="number"
                              className="form-input"
                              value={formAnswers[q.id] || 0}
                              onChange={(e) => handleSurveyChange(q.id, parseInt(e.target.value, 10) || 0)}
                              style={{
                                width: '80px',
                                textAlign: 'center',
                                padding: '8px 4px',
                                fontSize: '1.1rem',
                                fontWeight: 600,
                                minHeight: 'unset'
                              }}
                              min="0"
                            />
                            <button
                              type="button"
                              className="stepper__btn"
                              onClick={() => handleSurveyChange(q.id, (Number(formAnswers[q.id]) || 0) + 1)}
                            >
                              +
                            </button>
                          </div>
                        ) : q.question_type === 'date' ? (
                          <input
                            type="date"
                            className="form-input"
                            value={formAnswers[q.id] || ''}
                            onChange={(e) => handleSurveyChange(q.id, e.target.value)}
                            required={q.is_required}
                          />
                        ) : q.question_type === 'select' ? (
                          <select
                            className="form-input form-select"
                            value={formAnswers[q.id] || ''}
                            onChange={(e) => handleSurveyChange(q.id, e.target.value)}
                            required={q.is_required}
                          >
                            <option value="">{language === 'en' ? 'Select option...' : 'पर्याय निवडा...'}</option>
                            {q.options?.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            className="form-input"
                            value={formAnswers[q.id] || ''}
                            onChange={(e) => handleSurveyChange(q.id, e.target.value)}
                            placeholder={language === 'en' ? 'Type answer here...' : 'उत्तर इथे टाका...'}
                            required={q.is_required}
                          />
                        )}
                      </div>
                    ))}

                    <button type="submit" className="btn btn--primary" style={{ marginTop: '16px' }}>
                      {t('forms.submit.responses')}
                    </button>
                  </form>
                ) : (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    <HelpCircle size={32} style={{ marginBottom: '8px' }} />
                    <p>{language === 'en' ? 'No questions in this survey form.' : 'या सर्वेक्षण फॉर्ममध्ये प्रश्न नाहीत.'}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            <ClipboardList size={40} style={{ marginBottom: '12px' }} />
            <p>{t('forms.no_forms')}</p>
          </div>
        )}
      </div>

      {/* Sticky Bottom Actions Bar */}
      <div className="sticky-bar sticky-bar--hm">
        <div className="sticky-bar__stats">
          <div className="sticky-bar__stat">
            <span className="sticky-bar__stat-value">{schoolData.total_students || 0}</span>
            <span className="sticky-bar__stat-label">{t('stats.students')}</span>
          </div>
          <div className="sticky-bar__stat">
            <span className="sticky-bar__stat-value" style={{ color: '#3b82f6' }}>{schoolData.male_students || 0}</span>
            <span className="sticky-bar__stat-label">{t('stats.boys')}</span>
          </div>
          <div className="sticky-bar__stat">
            <span className="sticky-bar__stat-value" style={{ color: '#ec4899' }}>{schoolData.female_students || 0}</span>
            <span className="sticky-bar__stat-label">{t('stats.girls')}</span>
          </div>
        </div>

        <button
          className="btn btn--primary"
          onClick={handleSaveSchoolData}
          disabled={!hasChanges || saving}
          style={{ minWidth: '150px' }}
        >
          {saving ? (
            <div className="spinner"></div>
          ) : (
            <>
              <Save size={18} /> {t('action.save')}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default StudentRecordsPage;
