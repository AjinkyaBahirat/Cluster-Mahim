import React, { useState, useEffect } from 'react';
import { getExcelSheets, getExcelSheetData, uploadExcelSheet, deleteExcelSheet, toggleExcelVisibility } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Modal from '../components/Modal';
import { FileSpreadsheet, Plus, Trash2, Download, ArrowLeft, Eye, EyeOff } from 'lucide-react';

const ExcelSheetsPage = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [sheets, setSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // Form states
  const [title, setTitle] = useState('');
  const [titleMr, setTitleMr] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchSheets = async () => {
    try {
      const data = await getExcelSheets();
      setSheets(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch Excel sheets list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSheets();
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!title) {
      showToast('Title is required', 'error');
      return;
    }
    if (!file) {
      showToast('Excel file is required', 'error');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('title_mr', titleMr);
      formData.append('file', file);

      await uploadExcelSheet(formData);
      showToast(t('excel.uploaded'));
      setIsModalOpen(false);
      resetForm();
      setLoading(true);
      fetchSheets();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Failed to upload sheet', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (window.confirm(language === 'en' ? 'Are you sure you want to delete this Excel sheet?' : 'तुम्हाला खात्री आहे की तुम्ही हा एक्सेल तक्ता हटवू इच्छिता?')) {
      try {
        await deleteExcelSheet(id);
        showToast('Sheet deleted successfully!');
        if (selectedSheet?.id === id) {
          setSelectedSheet(null);
        }
        setLoading(true);
        fetchSheets();
      } catch (err) {
        console.error(err);
        showToast('Failed to delete Excel sheet', 'error');
      }
    }
  };

  const handleToggleVisibility = async (id, e) => {
    e.stopPropagation();
    try {
      const result = await toggleExcelVisibility(id);
      showToast(
        result.visible_to_schools 
          ? (language === 'en' ? 'Sheet is now visible to schools' : 'तक्ता आता शाळांना दिसेल')
          : (language === 'en' ? 'Sheet hidden from schools' : 'तक्ता शाळांपासून लपवला'),
        'success'
      );
      // Update local state
      setSheets(prev => prev.map(s => 
        s.id === id ? { ...s, visible_to_schools: result.visible_to_schools } : s
      ));
    } catch (err) {
      console.error(err);
      showToast('Failed to toggle visibility', 'error');
    }
  };

  const handleSelectSheet = async (id) => {
    setLoading(true);
    try {
      const data = await getExcelSheetData(id);
      setSelectedSheet(data);
    } catch (err) {
      console.error(err);
      showToast('Failed to parse sheet data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setTitleMr('');
    setFile(null);
  };

  if (loading && !selectedSheet) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="skeleton" style={{ height: '40px', width: '200px' }}></div>
        <div className="grid-3">
          {[1, 2].map((n) => (
            <div key={n} className="skeleton" style={{ height: '120px', borderRadius: '12px' }}></div>
          ))}
        </div>
      </div>
    );
  }

  if (selectedSheet) {
    const sheetData = selectedSheet.sheet_data || [];
    const headers = sheetData.length > 0 ? sheetData[0] : [];
    const rows = sheetData.length > 1 ? sheetData.slice(1) : [];

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
          <button className="btn btn--ghost btn--sm" onClick={() => setSelectedSheet(null)} style={{ paddingLeft: 0, marginBottom: '16px' }}>
            <ArrowLeft size={16} /> {t('action.back')}
          </button>
          
          <div className="page-header" style={{ marginBottom: 0 }}>
            <div>
              <h1 className="page-title">
                {language === 'en' ? selectedSheet.title : (selectedSheet.title_mr || selectedSheet.title)}
              </h1>
              <p className="page-subtitle">{selectedSheet.file_name}</p>
            </div>
            
            <a 
              href={`/api/excel/${selectedSheet.id}/download`} 
              className="btn btn--primary"
            >
              <Download size={16} /> {t('action.download')}
            </a>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">{t('excel.render')}</h3>

          {headers.length > 0 ? (
            <div className="data-table-container" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    {headers.map((h, idx) => (
                      <th key={idx} style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 10 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      {row.map((cell, cellIdx) => (
                        <td key={cellIdx}>
                          {cell !== undefined && cell !== null ? String(cell) : ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
              <p>{language === 'en' ? 'Excel sheet is empty.' : 'हा एक्सेल तक्ता रिक्त आहे.'}</p>
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
          <h1 className="page-title">{t('excel.title')}</h1>
          <p className="page-subtitle">{t('excel.subtitle')}</p>
        </div>
        {user?.role === 'cluster' && (
          <button className="btn btn--primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> {t('action.add')}
          </button>
        )}
      </div>

      {sheets.length > 0 ? (
        <div className="grid-3">
          {sheets.map((sheet) => (
            <div 
              key={sheet.id} 
              className="card school-card" 
              onClick={() => handleSelectSheet(sheet.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                <h3 className="school-card__name" style={{ fontSize: '1.2rem', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileSpreadsheet size={20} style={{ color: 'var(--success)' }} />
                  {language === 'en' ? sheet.title : (sheet.title_mr || sheet.title)}
                </h3>

                {user?.role === 'cluster' && (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {/* Visibility Toggle */}
                    <button
                      className={`btn btn--ghost btn--sm`}
                      style={{ 
                        color: sheet.visible_to_schools ? 'var(--success)' : 'var(--text-muted)', 
                        padding: '4px' 
                      }}
                      onClick={(e) => handleToggleVisibility(sheet.id, e)}
                      title={sheet.visible_to_schools 
                        ? (language === 'en' ? 'Visible to schools (click to hide)' : 'शाळांना दिसत आहे (लपवण्यासाठी क्लिक करा)')
                        : (language === 'en' ? 'Hidden from schools (click to show)' : 'शाळांपासून लपवले (दाखवण्यासाठी क्लिक करा)')
                      }
                    >
                      {sheet.visible_to_schools ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button
                      className="btn btn--ghost btn--sm"
                      style={{ color: 'var(--danger)', padding: '4px' }}
                      onClick={(e) => handleDelete(sheet.id, e)}
                      title={t('action.delete')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Visibility badge for cluster */}
              {user?.role === 'cluster' && (
                <div style={{ marginTop: '4px' }}>
                  <span 
                    className={`badge ${sheet.visible_to_schools ? 'badge--success' : 'badge--warning'}`} 
                    style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                  >
                    {sheet.visible_to_schools 
                      ? (language === 'en' ? 'Visible to schools' : 'शाळांना दृश्यमान') 
                      : (language === 'en' ? 'Hidden from schools' : 'शाळांपासून लपवले')
                    }
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>{sheet.file_name}</span>
                <span>{new Date(sheet.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '64px', color: 'var(--text-muted)' }}>
          <FileSpreadsheet size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <h3>{t('excel.empty')}</h3>
        </div>
      )}

      {/* Upload Sheet Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={t('excel.upload')}>
        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">{t('excel.title_label')}</label>
            <input
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Cluster Teachers List"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('excel.title_label_mr')}</label>
            <input
              type="text"
              className="form-input"
              value={titleMr}
              onChange={(e) => setTitleMr(e.target.value)}
              placeholder="उदा. केंद्र शाळा शिक्षक यादी"
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('excel.file')}</label>
            <input
              type="file"
              onChange={handleFileChange}
              accept=".xlsx,.xls"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-glass)',
                padding: '8px',
                borderRadius: '8px',
                width: '100%',
                color: 'var(--text-primary)'
              }}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn--secondary" disabled={uploading}>
              {t('action.cancel')}
            </button>
            <button type="submit" className="btn btn--primary" disabled={uploading}>
              {uploading ? <div className="spinner"></div> : t('action.submit')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ExcelSheetsPage;
