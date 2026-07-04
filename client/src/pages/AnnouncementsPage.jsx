import React, { useState, useEffect } from 'react';
import { getAnnouncements, createAnnouncement, deleteAnnouncement } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Modal from '../components/Modal';
import { Megaphone, Plus, Trash2, Download, FileText, Image as ImageIcon, Eye } from 'lucide-react';

const AnnouncementsPage = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewType, setPreviewType] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [toast, setToast] = useState(null);

  // Form states
  const [title, setTitle] = useState('');
  const [titleMr, setTitleMr] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionMr, setDescriptionMr] = useState('');
  const [file, setFile] = useState(null);
  const [posting, setPosting] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAnnouncements = async () => {
    try {
      const data = await getAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch announcements list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const parseCSV = (text) => {
    return text.split('\n')
      .map(line => {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      })
      .filter(row => row.length > 0 && row.some(cell => cell !== ''));
  };

  const handlePreviewCsv = async (ann) => {
    setPreviewTitle(language === 'en' ? ann.title : (ann.title_mr || ann.title));
    setPreviewType('csv');
    setPreviewLoading(true);
    setIsPreviewModalOpen(true);
    try {
      const response = await fetch(`/api/announcements/${ann.id}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
        }
      });
      const text = await response.text();
      const parsed = parseCSV(text);
      setPreviewData(parsed);
    } catch (err) {
      console.error(err);
      showToast('Failed to load CSV preview', 'error');
      setIsPreviewModalOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePreviewPdf = (ann) => {
    setPreviewTitle(language === 'en' ? ann.title : (ann.title_mr || ann.title));
    setPreviewType('pdf');
    setPreviewUrl(ann.file_path);
    setIsPreviewModalOpen(true);
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title) {
      showToast('Title is required', 'error');
      return;
    }

    setPosting(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('title_mr', titleMr);
      formData.append('description', description);
      formData.append('description_mr', descriptionMr);
      if (file) {
        formData.append('file', file);
      }

      await createAnnouncement(formData);
      showToast(t('ann.created'));
      setIsModalOpen(false);
      resetForm();
      setLoading(true);
      fetchAnnouncements();
    } catch (err) {
      console.error(err);
      showToast('Failed to post announcement', 'error');
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm(language === 'en' ? 'Are you sure you want to delete this announcement?' : 'तुम्हाला खात्री आहे की तुम्ही ही सूचना हटवू इच्छिता?')) {
      try {
        await deleteAnnouncement(id);
        showToast(t('ann.deleted'));
        setLoading(true);
        fetchAnnouncements();
      } catch (err) {
        console.error(err);
        showToast('Failed to delete announcement', 'error');
      }
    }
  };

  const resetForm = () => {
    setTitle('');
    setTitleMr('');
    setDescription('');
    setDescriptionMr('');
    setFile(null);
  };

  const isImageFile = (type) => {
    return type?.startsWith('image/');
  };

  const getFileIcon = (fileName) => {
    if (fileName?.toLowerCase().endsWith('.csv')) return <span>📊</span>;
    if (fileName?.toLowerCase().endsWith('.png') || fileName?.toLowerCase().endsWith('.jpg') || fileName?.toLowerCase().endsWith('.jpeg')) {
      return <ImageIcon size={20} style={{ color: 'var(--info)' }} />;
    }
    return <FileText size={20} style={{ color: 'var(--danger)' }} />;
  };

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
          <h1 className="page-title">{t('ann.title')}</h1>
          <p className="page-subtitle">{t('ann.subtitle')}</p>
        </div>
        {user?.role === 'cluster' && (
          <button className="btn btn--primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> {t('action.add')}
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="skeleton" style={{ height: '160px', borderRadius: '16px' }}></div>
          ))}
        </div>
      ) : error ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px', borderColor: 'var(--danger)' }}>
          <p style={{ color: 'var(--danger)' }}>{error}</p>
        </div>
      ) : announcements.length > 0 ? (
        <div className="grid-3">
          {announcements.map((ann) => (
            <div key={ann.id} className="card school-card" style={{ cursor: 'default' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                <h3 className="school-card__name" style={{ fontSize: '1.2rem', marginBottom: 0, paddingRight: '24px' }}>
                  {language === 'en' ? ann.title : (ann.title_mr || ann.title)}
                </h3>
                {user?.role === 'cluster' && (
                  <button
                    className="btn btn--ghost btn--sm"
                    style={{ color: 'var(--danger)', padding: '4px', position: 'absolute', top: '16px', right: '16px' }}
                    onClick={() => handleDelete(ann.id)}
                    title={t('action.delete')}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px', minHeight: '40px' }}>
                {language === 'en' ? ann.description : (ann.description_mr || ann.description)}
              </p>

              {ann.file_path && (
                <div 
                  className="card" 
                  style={{ 
                    padding: '12px', 
                    background: 'rgba(255,255,255,0.01)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    {getFileIcon(ann.file_name)}
                    <span 
                      style={{ 
                        fontSize: '0.8rem', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap', 
                        maxWidth: '140px' 
                      }}
                      title={ann.file_name}
                    >
                      {ann.file_name}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    {ann.file_name?.toLowerCase().endsWith('.csv') && (
                      <button
                        className="btn btn--secondary btn--sm"
                        style={{ padding: '6px 10px', minHeight: 'unset', display: 'flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => handlePreviewCsv(ann)}
                        title={language === 'en' ? 'Preview CSV' : 'पूर्वावलोकन पहा'}
                      >
                        <Eye size={14} />
                      </button>
                    )}
                    {ann.file_name?.toLowerCase().endsWith('.pdf') && (
                      <button
                        className="btn btn--secondary btn--sm"
                        style={{ padding: '6px 10px', minHeight: 'unset', display: 'flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => handlePreviewPdf(ann)}
                        title={language === 'en' ? 'Preview PDF' : 'परिपत्रक पहा'}
                      >
                        <Eye size={14} />
                      </button>
                    )}
                    <a 
                      href={`/api/announcements/${ann.id}/download`} 
                      download 
                      className="btn btn--secondary btn--sm" 
                      style={{ padding: '6px 10px', minHeight: 'unset' }}
                    >
                      <Download size={14} />
                    </a>
                  </div>
                </div>
              )}

              {/* Inline Image Preview */}
              {ann.file_path && isImageFile(ann.file_type) && (
                <div style={{ marginTop: '12px', borderRadius: '8px', overflow: 'hidden', maxHeight: '120px', border: '1px solid var(--border-glass)' }}>
                  <img 
                    src={ann.file_path} 
                    alt={ann.file_name} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                </div>
              )}

              <div style={{ marginTop: '12px', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {new Date(ann.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '64px', color: 'var(--text-muted)' }}>
          <Megaphone size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <h3>{language === 'en' ? 'No Announcements Circulars' : 'कोणतीही सूचना किंवा परिपत्रक उपलब्ध नाही'}</h3>
        </div>
      )}

      {/* Upload Announcement Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={t('ann.new')}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">{t('ann.subject')}</label>
            <input
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter subject in English"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('ann.subject_mr')}</label>
            <input
              type="text"
              className="form-input"
              value={titleMr}
              onChange={(e) => setTitleMr(e.target.value)}
              placeholder="मराठीत विषय टाका"
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('ann.body')}</label>
            <textarea
              className="form-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Circular details in English..."
              style={{ minHeight: '80px', resize: 'vertical' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('ann.body_mr')}</label>
            <textarea
              className="form-input"
              value={descriptionMr}
              onChange={(e) => setDescriptionMr(e.target.value)}
              placeholder="सविस्तर मजकूर मराठीत टाका..."
              style={{ minHeight: '80px', resize: 'vertical' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('ann.attachment')}</label>
            <input
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.csv,image/*"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-glass)',
                padding: '8px',
                borderRadius: '8px',
                width: '100%',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn--secondary" disabled={posting}>
              {t('action.cancel')}
            </button>
            <button type="submit" className="btn btn--primary" disabled={posting}>
              {posting ? <div className="spinner"></div> : t('action.submit')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Document Preview Modal (CSV or PDF) */}
      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        title={`${previewType === 'csv' ? (language === 'en' ? 'CSV Preview' : 'CSV पूर्वावलोकन') : (language === 'en' ? 'Circular PDF Preview' : 'परिपत्रक पीडीएफ पूर्वावलोकन')} - ${previewTitle}`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {previewType === 'csv' ? (
            previewLoading ? (
              <div style={{ textAlign: 'center', padding: '32px' }}>
                <div className="spinner" style={{ margin: '0 auto' }}></div>
                <p style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>Loading preview...</p>
              </div>
            ) : previewData.length > 0 ? (
              <div style={{ overflowX: 'auto', maxHeight: '50vh', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                <table className="data-table" style={{ width: 'max-content', minWidth: '100%', fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      {previewData[0].map((cell, idx) => (
                        <th key={idx}>{cell}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(1).map((row, rowIdx) => (
                      <tr key={rowIdx}>
                        {row.map((cell, cellIdx) => (
                          <td key={cellIdx}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                No data available to preview.
              </div>
            )
          ) : (
            /* PDF Preview */
            <div style={{ width: '100%', height: '65vh', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
              <iframe 
                src={previewUrl} 
                title="PDF Preview" 
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn--secondary" onClick={() => setIsPreviewModalOpen(false)}>
              {t('action.cancel')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AnnouncementsPage;
