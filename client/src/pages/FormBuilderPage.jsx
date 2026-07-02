import React, { useState, useEffect } from 'react';
import { getForms, createForm, deleteForm, getForm, getSchools } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import Modal from '../components/Modal';
import { Plus, Trash2, ClipboardList, Eye, ArrowLeft, PlusCircle, Check } from 'lucide-react';

const FormBuilderPage = () => {
  const { t, language } = useLanguage();
  const [forms, setForms] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formTitleMr, setFormTitleMr] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDescMr, setFormDescMr] = useState('');
  const [questions, setQuestions] = useState([]);
  
  // View response state
  const [activeFormDetails, setActiveFormDetails] = useState(null);
  
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadPageData = async () => {
    try {
      const [formData, schoolData] = await Promise.all([
        getForms(),
        getSchools()
      ]);
      setForms(formData);
      setSchools(schoolData);
    } catch (err) {
      console.error(err);
      setError('Failed to load forms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPageData();
  }, []);

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        question_text: '',
        question_text_mr: '',
        question_type: 'text',
        options: '', // Comma separated options if type is select
        is_required: false
      }
    ]);
  };

  const handleUpdateQuestion = (index, key, value) => {
    setQuestions(prev => prev.map((q, idx) => {
      if (idx === index) {
        return { ...q, [key]: value };
      }
      return q;
    }));
  };

  const handleRemoveQuestion = (index) => {
    setQuestions(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleCreateForm = async (e) => {
    e.preventDefault();
    if (!formTitle) {
      showToast('Form title is required', 'error');
      return;
    }

    if (questions.length === 0) {
      showToast('Please add at least one question', 'error');
      return;
    }

    try {
      // Map questions to API format
      const mappedQuestions = questions.map(q => ({
        ...q,
        options: q.question_type === 'select' ? q.options.split(',').map(s => s.trim()).filter(Boolean) : null
      }));

      await createForm({
        title: formTitle,
        title_mr: formTitleMr,
        description: formDesc,
        description_mr: formDescMr,
        questions: mappedQuestions
      });

      showToast(t('forms.created'));
      setIsModalOpen(false);
      resetBuilder();
      setLoading(true);
      loadPageData();
    } catch (err) {
      console.error(err);
      showToast('Failed to create form', 'error');
    }
  };

  const handleDeleteForm = async (id, e) => {
    e.stopPropagation();
    if (window.confirm(t('forms.delete.confirm'))) {
      try {
        await deleteForm(id);
        showToast('Form deleted successfully!');
        if (activeFormDetails?.id === id) {
          setActiveFormDetails(null);
        }
        setLoading(true);
        loadPageData();
      } catch (err) {
        console.error(err);
        showToast('Failed to delete form', 'error');
      }
    }
  };

  const handleViewResponses = async (formId) => {
    try {
      setLoading(true);
      const data = await getForm(formId);
      setActiveFormDetails(data);
    } catch (err) {
      console.error(err);
      showToast('Failed to load form responses', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetBuilder = () => {
    setFormTitle('');
    setFormTitleMr('');
    setFormDesc('');
    setFormDescMr('');
    setQuestions([]);
  };

  if (loading && !activeFormDetails) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="skeleton" style={{ height: '40px', width: '250px' }}></div>
        <div className="stats-grid">
          {[1, 2, 3].map((n) => (
            <div key={n} className="skeleton" style={{ height: '100px', borderRadius: '12px' }}></div>
          ))}
        </div>
      </div>
    );
  }

  if (activeFormDetails) {
    // Render school response grid matrix
    const formQuestions = activeFormDetails.questions || [];
    const formResponses = activeFormDetails.responses || [];

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
          <button className="btn btn--ghost btn--sm" onClick={() => setActiveFormDetails(null)} style={{ paddingLeft: 0, marginBottom: '16px' }}>
            <ArrowLeft size={16} /> {t('action.back')}
          </button>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <div>
              <h1 className="page-title">{t('forms.submissions')}</h1>
              <p className="page-subtitle">{language === 'en' ? activeFormDetails.title : (activeFormDetails.title_mr || activeFormDetails.title)}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">{t('forms.submissions_view')}</h3>

          {formResponses.length > 0 ? (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{language === 'en' ? 'School Name' : 'शाळेचे नाव'}</th>
                    {formQuestions.map(q => (
                      <th key={q.id}>
                        {language === 'en' ? q.question_text : (q.question_text_mr || q.question_text)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {schools.map(school => {
                    const schoolResponses = formResponses.filter(r => r.school_id === school.id);
                    if (schoolResponses.length === 0) return null; // Only show schools that have submitted responses
                    
                    return (
                      <tr key={school.id}>
                        <td style={{ fontWeight: 600 }}>{school.name}</td>
                        {formQuestions.map(q => {
                          const resp = schoolResponses.find(r => r.question_id === q.id);
                          return (
                            <td key={q.id}>
                              {resp ? (
                                resp.response_value === 'yes' ? (
                                  <span className="badge badge--success">Yes / होय</span>
                                ) : resp.response_value === 'no' ? (
                                  <span className="badge badge--danger">No / नाही</span>
                                ) : (
                                  resp.response_value
                                )
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
              <Eye size={40} style={{ marginBottom: '12px' }} />
              <p>{language === 'en' ? 'No schools have submitted responses for this survey yet.' : 'या सर्वेक्षणासाठी अद्याप कोणत्याही शाळेने प्रतिसाद दिलेला नाही.'}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {toast && (
        <div className="toast-container">
          <div className={`toast toast--${toast.type}`}>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">{t('forms.title')}</h1>
          <p className="page-subtitle">{t('forms.subtitle')}</p>
        </div>
        <button className="btn btn--primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> {t('forms.create')}
        </button>
      </div>

      {forms.length > 0 ? (
        <div className="grid-3">
          {forms.map((form) => (
            <div key={form.id} className="card school-card" onClick={() => handleViewResponses(form.id)}>
              <h3 className="school-card__name" style={{ fontSize: '1.2rem', marginBottom: '8px' }}>
                {language === 'en' ? form.title : (form.title_mr || form.title)}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', minHeight: '40px', marginBottom: '16px' }}>
                {language === 'en' ? form.description : (form.description_mr || form.description)}
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--border-glass)' }}>
                <span className={`badge ${form.is_active ? 'badge--success' : 'badge--warning'}`}>
                  {form.is_active ? t('forms.active') : t('forms.inactive')}
                </span>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn--ghost btn--sm" style={{ padding: '6px' }} title={t('forms.submissions')}>
                    <Eye size={16} />
                  </button>
                  <button 
                    className="btn btn--ghost btn--sm" 
                    style={{ color: 'var(--danger)', padding: '6px' }} 
                    onClick={(e) => handleDeleteForm(form.id, e)}
                    title={t('action.delete')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '64px' }}>
          <ClipboardList size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <h3 style={{ marginBottom: '8px' }}>{language === 'en' ? 'No surveys created' : 'अद्याप एकही फॉर्म तयार केलेला नाही'}</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            {language === 'en' ? 'Create custom information survey forms that Headmasters can fill directly.' : 'सानुकूल सर्वेक्षण फॉर्म तयार करा जे मुख्याध्यापक त्यांच्या लॉगिनवरून भरू शकतील.'}
          </p>
          <button className="btn btn--primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> {t('forms.create')}
          </button>
        </div>
      )}

      {/* Form Creator Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={t('forms.new')}>
        <form onSubmit={handleCreateForm} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '75vh', overflowY: 'auto', paddingRight: '8px' }}>
          <div className="form-group">
            <label className="form-label">{t('forms.form.title')}</label>
            <input
              type="text"
              className="form-input"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. Mid-Day Meal Daily Survey"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('forms.form.title_mr')}</label>
            <input
              type="text"
              className="form-input"
              value={formTitleMr}
              onChange={(e) => setFormTitleMr(e.target.value)}
              placeholder="उदा. शालेय पोषण आहार दैनिक सर्वेक्षण"
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('forms.form.desc')}</label>
            <textarea
              className="form-input"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Brief details about the survey..."
              style={{ minHeight: '60px', resize: 'vertical' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('forms.form.desc_mr')}</label>
            <textarea
              className="form-input"
              value={formDescMr}
              onChange={(e) => setFormDescMr(e.target.value)}
              placeholder="सर्वेक्षणाबद्दल थोडक्यात माहिती..."
              style={{ minHeight: '60px', resize: 'vertical' }}
            />
          </div>

          <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
            <h4 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span>{t('schooldata.survey')} ({questions.length})</span>
              <button type="button" onClick={handleAddQuestion} className="btn btn--secondary btn--sm">
                <PlusCircle size={14} /> {t('forms.add_question')}
              </button>
            </h4>

            {questions.map((q, idx) => (
              <div key={idx} className="card" style={{ marginBottom: '16px', background: 'rgba(255,255,255,0.01)', borderStyle: 'dashed' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontWeight: 600 }}>{language === 'en' ? `Question #${idx + 1}` : `प्रश्न क्र. ${idx + 1}`}</span>
                  <button type="button" onClick={() => handleRemoveQuestion(idx)} className="btn btn--ghost btn--sm" style={{ color: 'var(--danger)', padding: '4px' }}>
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="form-group">
                  <label className="form-label">{t('forms.question_text')}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={q.question_text}
                    onChange={(e) => handleUpdateQuestion(idx, 'question_text', e.target.value)}
                    placeholder="Enter question text in English"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('forms.question_text_mr')}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={q.question_text_mr}
                    onChange={(e) => handleUpdateQuestion(idx, 'question_text_mr', e.target.value)}
                    placeholder="मराठीत प्रश्न मजकूर टाका"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">{t('forms.question_type')}</label>
                    <select
                      className="form-input form-select"
                      value={q.question_type}
                      onChange={(e) => handleUpdateQuestion(idx, 'question_type', e.target.value)}
                    >
                      <option value="text">{t('qtype.text')}</option>
                      <option value="number">{t('qtype.number')}</option>
                      <option value="yes_no">{t('qtype.yes_no')}</option>
                      <option value="select">{t('qtype.select')}</option>
                      <option value="date">{t('qtype.date')}</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">{t('forms.required')}</label>
                    <div style={{ display: 'flex', alignItems: 'center', height: '48px' }}>
                      <input
                        type="checkbox"
                        checked={q.is_required}
                        onChange={(e) => handleUpdateQuestion(idx, 'is_required', e.target.checked)}
                        style={{ width: '20px', height: '20px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                      />
                    </div>
                  </div>
                </div>

                {q.question_type === 'select' && (
                  <div className="form-group">
                    <label className="form-label">{language === 'en' ? 'Dropdown Options (Comma separated)' : 'ड्रॉपडाउन पर्याय (स्वल्पविराम देऊन टाका)'}</label>
                    <input
                      type="text"
                      className="form-input"
                      value={q.options}
                      onChange={(e) => handleUpdateQuestion(idx, 'options', e.target.value)}
                      placeholder="Option 1, Option 2, Option 3"
                      required
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn--secondary">
              {t('action.cancel')}
            </button>
            <button type="submit" className="btn btn--primary">
              <Check size={16} /> {t('action.save')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default FormBuilderPage;
