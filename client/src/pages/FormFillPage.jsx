import React, { useState, useEffect } from 'react';
import { getForms, getForm, submitFormResponse } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { ClipboardList, CheckSquare, Clock, ArrowLeft, HelpCircle } from 'lucide-react';

const FormFillPage = () => {
  const { t, language } = { ...useLanguage() };
  const [forms, setForms] = useState([]);
  const [selectedForm, setSelectedForm] = useState(null);
  const [formQuestions, setFormQuestions] = useState([]);
  const [formAnswers, setFormAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchActiveForms = async () => {
    try {
      const data = await getForms();
      setForms(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch survey forms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveForms();
  }, []);

  const handleOpenForm = async (formId) => {
    try {
      setLoading(true);
      const data = await getForm(formId);
      setFormQuestions(data.questions || []);
      
      const initialAnswers = {};
      data.questions?.forEach(q => {
        const resp = data.responses?.find(r => r.question_id === q.id);
        initialAnswers[q.id] = resp ? resp.response_value : (q.question_type === 'yes_no' ? 'no' : '');
      });
      
      setFormAnswers(initialAnswers);
      const selected = forms.find(f => f.id === formId);
      setSelectedForm(selected);
    } catch (err) {
      console.error(err);
      showToast('Failed to load questions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (qId, value) => {
    setFormAnswers(prev => ({
      ...prev,
      [qId]: value
    }));
  };

  const handleSubmitResponses = async (e) => {
    e.preventDefault();
    if (!selectedForm) return;

    // Validate required fields
    const missing = formQuestions.some(q => q.is_required && !formAnswers[q.id] && formAnswers[q.id] !== 0);
    if (missing) {
      showToast(language === 'en' ? 'Please fill out all required fields' : 'कृपया सर्व आवश्यक प्रश्नांची उत्तरे द्या', 'error');
      return;
    }

    try {
      const payload = Object.keys(formAnswers).map(qId => ({
        question_id: parseInt(qId, 10),
        response_value: formAnswers[qId]
      }));

      await submitFormResponse(selectedForm.id, payload);
      showToast(t('forms.responses.saved'));
      setSelectedForm(null);
      setLoading(true);
      fetchActiveForms();
    } catch (err) {
      console.error(err);
      showToast('Failed to save survey answers', 'error');
    }
  };

  if (loading && !selectedForm) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="skeleton" style={{ height: '40px', width: '200px' }}></div>
        <div className="stats-grid">
          {[1, 2].map((n) => (
            <div key={n} className="skeleton" style={{ height: '100px', borderRadius: '12px' }}></div>
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

  if (selectedForm) {
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
          <button className="btn btn--ghost btn--sm" onClick={() => setSelectedForm(null)} style={{ paddingLeft: 0, marginBottom: '16px' }}>
            <ArrowLeft size={16} /> {t('action.back')}
          </button>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <div>
              <h1 className="page-title">
                {language === 'en' ? selectedForm.title : (selectedForm.title_mr || selectedForm.title)}
              </h1>
              <p className="page-subtitle">
                {language === 'en' ? selectedForm.description : (selectedForm.description_mr || selectedForm.description)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          {formQuestions.length > 0 ? (
            <form onSubmit={handleSubmitResponses} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                        onClick={() => handleAnswerChange(q.id, 'yes')}
                        className={`btn btn--sm ${formAnswers[q.id] === 'yes' ? 'btn--primary' : 'btn--secondary'}`}
                      >
                        {language === 'en' ? 'Yes' : 'होय'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAnswerChange(q.id, 'no')}
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
                        onClick={() => handleAnswerChange(q.id, Math.max(0, (Number(formAnswers[q.id]) || 0) - 1))}
                      >
                        -
                      </button>
                      <span className="stepper__value">{formAnswers[q.id] || 0}</span>
                      <button
                        type="button"
                        className="stepper__btn"
                        onClick={() => handleAnswerChange(q.id, (Number(formAnswers[q.id]) || 0) + 1)}
                      >
                        +
                      </button>
                    </div>
                  ) : q.question_type === 'date' ? (
                    <input
                      type="date"
                      className="form-input"
                      value={formAnswers[q.id] || ''}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      required={q.is_required}
                    />
                  ) : q.question_type === 'select' ? (
                    <select
                      className="form-input form-select"
                      value={formAnswers[q.id] || ''}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      required={q.is_required}
                    >
                      <option value="">Select option...</option>
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
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      placeholder="Type answer here..."
                      required={q.is_required}
                    />
                  )}
                </div>
              ))}

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button type="button" onClick={() => setSelectedForm(null)} className="btn btn--secondary">
                  {t('action.cancel')}
                </button>
                <button type="submit" className="btn btn--primary">
                  {t('forms.submit.responses')}
                </button>
              </div>
            </form>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
              <HelpCircle size={40} style={{ marginBottom: '12px' }} />
              <p>{language === 'en' ? 'No questions in this survey form.' : 'या सर्वेक्षण फॉर्ममध्ये प्रश्न नाहीत.'}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('forms.title')}</h1>
          <p className="page-subtitle">{language === 'en' ? 'Fill forms and questionnaires requested by cluster' : 'क्लस्टरकडून मागवलेली सर्वेक्षणे आणि माहिती भरा'}</p>
        </div>
      </div>

      {forms.length > 0 ? (
        <div className="grid-3">
          {forms.map((form) => (
            <div
              key={form.id}
              className="card school-card"
              onClick={() => handleOpenForm(form.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                <h3 className="school-card__name" style={{ fontSize: '1.2rem', marginBottom: 0 }}>
                  {language === 'en' ? form.title : (form.title_mr || form.title)}
                </h3>
                <span className={`badge ${form.has_responded ? 'badge--success' : 'badge--warning'}`}>
                  {form.has_responded ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckSquare size={12} /> {language === 'en' ? 'Done' : 'पूर्ण'}
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {language === 'en' ? 'Pending' : 'बाकी'}
                    </span>
                  )}
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 0 }}>
                {language === 'en' ? form.description : (form.description_mr || form.description)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '64px', color: 'var(--text-muted)' }}>
          <ClipboardList size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <h3>{t('forms.no_forms')}</h3>
        </div>
      )}
    </div>
  );
};

export default FormFillPage;
