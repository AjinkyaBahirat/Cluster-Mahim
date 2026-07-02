import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getSchools, createSchool, exportSchoolData } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import Modal from '../components/Modal';
import WizardForm from '../components/WizardForm';
import { School, MapPin, Hash, Plus, Search } from 'lucide-react';

const SchoolsPage = () => {
  const { t, language } = useLanguage();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchSchools = async () => {
    try {
      const data = await getSchools();
      setSchools(data);
    } catch (err) {
      console.error(err);
      setError(t('schools.fetch_error') || 'Failed to fetch schools');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const handleAddSchool = async (formData) => {
    try {
      await createSchool(formData);
      showToast(t('schools.registered'));
      setIsModalOpen(false);
      setLoading(true);
      fetchSchools();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Failed to add school', 'error');
    }
  };

  const handleOpenReportModal = async () => {
    setLoadingReport(true);
    setIsReportModalOpen(true);
    try {
      const data = await exportSchoolData();
      setReportData(data.schools || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch cluster report data', 'error');
    } finally {
      setLoadingReport(false);
    }
  };

  const handleDownloadCSV = () => {
    if (reportData.length === 0) return;
    const headers = [
      "School Name", "UDISE Code", "School Type", "Village/Town", "PIN Code",
      "HM Name", "HM Phone", "Teachers Count", "Total Students", "Boys", "Girls",
      "Uniforms Distributed", "Books Distributed", "CCTV Present", "Toilets Present", "Holding Account Number"
    ];
    
    const rows = reportData.map(s => [
      `"${s.name}"`,
      `"${s.udise_code || ''}"`,
      `"${s.school_type || ''}"`,
      `"${s.village_town || ''}"`,
      `"${s.pin_code || ''}"`,
      `"${s.hm_name || 'Not Assigned'}"`,
      `"${s.hm_phone || ''}"`,
      s.teacher_count || 0,
      s.total_students || 0,
      s.male_students || 0,
      s.female_students || 0,
      s.uniform_distributed || 0,
      s.books_distributed || 0,
      `"${s.cctv_available || 'no'}"`,
      `"${s.toilets_available || 'no'}"`,
      `"${s.holding_account_number || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `mahim_cluster_report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintReport = () => {
    if (reportData.length === 0) return;
    const printWindow = window.open('', '_blank');
    const html = `
      <html>
        <head>
          <title>Mahim Cluster Report</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            h1 { margin-bottom: 5px; }
            h2 { font-size: 1rem; color: #666; margin-top: 0; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            tr:nth-child(even) { background-color: #fafafa; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <h1>Mahim Cluster - Consolidated Schools Report</h1>
          <h2>Generated on: ${new Date().toLocaleDateString()}</h2>
          <table>
            <thead>
              <tr>
                <th>School Name</th>
                <th>UDISE Code</th>
                <th>Type</th>
                <th>HM Name</th>
                <th>HM Phone</th>
                <th>Teachers</th>
                <th>Total Students</th>
                <th>Boys</th>
                <th>Girls</th>
                <th>Uniforms</th>
                <th>Books</th>
                <th>CCTV</th>
                <th>Toilets</th>
                <th>Holding A/C</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.map(s => `
                <tr>
                  <td>${s.name}</td>
                  <td>${s.udise_code || '-'}</td>
                  <td>${s.school_type}</td>
                  <td>${s.hm_name || 'Not Assigned'}</td>
                  <td>${s.hm_phone || '-'}</td>
                  <td>${s.teacher_count || 0}</td>
                  <td>${s.total_students || 0}</td>
                  <td>${s.male_students || 0}</td>
                  <td>${s.female_students || 0}</td>
                  <td>${s.uniform_distributed || 0}</td>
                  <td>${s.books_distributed || 0}</td>
                  <td>${s.cctv_available === 'yes' ? 'Yes' : 'No'}</td>
                  <td>${s.toilets_available === 'yes' ? 'Yes' : 'No'}</td>
                  <td>${s.holding_account_number || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const filteredSchools = schools.filter((school) =>
    school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (school.udise_code && school.udise_code.includes(searchQuery))
  );

  const wizardSteps = [
    {
      title: t('schools.title'),
      fields: [
        {
          name: 'name',
          label: language === 'en' ? 'School Name' : 'शाळेचे नाव',
          type: 'text',
          required: true,
          placeholder: language === 'en' ? 'e.g. Z. P. School Rampur' : 'उदा. जि. प. शाळा रामपूर'
        },
        {
          name: 'udise_code',
          label: t('schools.udise'),
          type: 'text',
          required: true,
          placeholder: '11-digit UDISE Code'
        },
        {
          name: 'school_type',
          label: t('schools.type'),
          type: 'select',
          required: true,
          options: [
            { value: 'ZP', label: t('type.zp') },
            { value: 'Private Aided', label: t('type.private_aided') },
            { value: 'Private Un-Aided', label: t('type.private_unaided') },
            { value: 'Self Finance', label: t('type.self_finance') }
          ],
          defaultValue: 'ZP'
        }
      ]
    },
    {
      title: language === 'en' ? 'Location details' : 'पत्ता व ठिकाण',
      fields: [
        {
          name: 'address',
          label: language === 'en' ? 'Street Address' : 'पत्ता',
          type: 'text',
          placeholder: 'e.g. Near Bus Stand'
        },
        {
          name: 'village_town',
          label: t('schools.village'),
          type: 'text',
          placeholder: 'e.g. Rampur'
        },
        {
          name: 'pin_code',
          label: t('schools.pincode'),
          type: 'text',
          placeholder: '6-digit code'
        }
      ]
    }
  ];

  const getLocalizedType = (type) => {
    switch (type) {
      case 'ZP': return t('type.zp');
      case 'Private Aided': return t('type.private_aided');
      case 'Private Un-Aided': return t('type.private_unaided');
      case 'Self Finance': return t('type.self_finance');
      default: return type;
    }
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
          <h1 className="page-title">{t('schools.title')}</h1>
          <p className="page-subtitle">{t('schools.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn--secondary" onClick={handleOpenReportModal}>
            📊 {language === 'en' ? 'Consolidated Report' : 'एकत्रित अहवाल'}
          </button>
          <button className="btn btn--primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> {t('schools.add')}
          </button>
        </div>
      </div>

      <div className="data-table__search">
        <Search className="data-table__search-icon" size={20} />
        <input
          type="text"
          className="form-input data-table__search-input"
          placeholder={t('schools.search')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="skeleton" style={{ height: '220px', borderRadius: '16px' }}></div>
          ))}
        </div>
      ) : error ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px', borderColor: 'var(--danger)' }}>
          <p style={{ color: 'var(--danger)' }}>{error}</p>
        </div>
      ) : filteredSchools.length > 0 ? (
        <div className="grid-3">
          {filteredSchools.map((school) => (
            <Link
              key={school.id}
              to={`/cluster/schools/${school.id}`}
              className="card school-card"
              style={{ textDecoration: 'none' }}
            >
              <h3 className="school-card__name">{school.name}</h3>
              <div className="school-card__info">
                <div className="school-card__info-item">
                  <Hash size={14} />
                  <span>UDISE: {school.udise_code || 'N/A'}</span>
                </div>
                <div className="school-card__info-item">
                  <MapPin size={14} />
                  <span>{school.village_town || 'N/A'}</span>
                </div>
                <div style={{ marginTop: '8px' }}>
                  <span className="badge badge--accent">{getLocalizedType(school.school_type)}</span>
                  <span
                    className={`badge ${
                      school.has_hm ? 'badge--success' : 'badge--warning'
                    }`}
                    style={{ marginLeft: '8px' }}
                  >
                    {school.has_hm ? (language === 'en' ? 'HM Assigned' : 'HM नियुक्त') : (language === 'en' ? 'HM Missing' : 'HM रिक्त')}
                  </span>
                </div>
              </div>

              <div className="school-card__stats">
                <div className="school-card__stat">
                  <div className="school-card__stat-value">{school.student_count || 0}</div>
                  <div className="school-card__stat-label">{t('stats.students')}</div>
                </div>
                <div className="school-card__stat-div" style={{ width: '1px', background: 'var(--border-glass)' }}></div>
                <div className="school-card__stat">
                  <div className="school-card__stat-value">{school.teacher_count || 0}</div>
                  <div className="school-card__stat-label">{t('stats.teachers')}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '64px' }}>
          <School size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <h3 style={{ marginBottom: '8px' }}>{language === 'en' ? 'No schools match search criteria' : 'शोध निकषांशी जुळणारी शाळा सापडली नाही'}</h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            {language === 'en' ? 'Try searching for something else or add a new school above.' : 'कृपया इतर नावाने शोधा किंवा वरून नवीन शाळा जोडा.'}
          </p>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={t('schools.add')}>
        <WizardForm
          steps={wizardSteps}
          onSubmit={handleAddSchool}
          onCancel={() => setIsModalOpen(false)}
          submitLabel={t('schools.add')}
        />
      </Modal>

      {/* Consolidated Report Modal */}
      <Modal 
        isOpen={isReportModalOpen} 
        onClose={() => setIsReportModalOpen(false)} 
        title={language === 'en' ? 'Consolidated Schools Report' : 'शाळांचा एकत्रित अहवाल'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '100%', overflowX: 'hidden' }}>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button className="btn btn--secondary btn--sm" onClick={handlePrintReport} disabled={loadingReport || reportData.length === 0}>
              🖨️ {language === 'en' ? 'Print Report' : 'प्रिंट करा'}
            </button>
            <button className="btn btn--primary btn--sm" onClick={handleDownloadCSV} disabled={loadingReport || reportData.length === 0}>
              📥 {language === 'en' ? 'Export CSV (Excel)' : 'CSV (एक्सेल) डाउनलोड'}
            </button>
          </div>

          {loadingReport ? (
            <div style={{ textAlign: 'center', padding: '32px' }}>
              <div className="spinner" style={{ margin: '0 auto' }}></div>
              <p style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>Loading report...</p>
            </div>
          ) : reportData.length > 0 ? (
            <div style={{ overflowX: 'auto', maxHeight: '50vh', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
              <table className="data-table" style={{ width: 'max-content', minWidth: '100%', fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>{language === 'en' ? 'School Name' : 'शाळेचे नाव'}</th>
                    <th>UDISE</th>
                    <th>{language === 'en' ? 'Type' : 'प्रकार'}</th>
                    <th>HM Name</th>
                    <th>Total Students</th>
                    <th>Boys</th>
                    <th>Girls</th>
                    <th>Uniforms</th>
                    <th>Books</th>
                    <th>CCTV</th>
                    <th>Toilets</th>
                    <th>Holding Account</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td>{s.udise_code || '-'}</td>
                      <td>{s.school_type}</td>
                      <td>{s.hm_name || <span style={{ color: 'var(--warning)' }}>Not Assigned</span>}</td>
                      <td>{s.total_students || 0}</td>
                      <td>{s.male_students || 0}</td>
                      <td>{s.female_students || 0}</td>
                      <td>{s.uniform_distributed || 0}</td>
                      <td>{s.books_distributed || 0}</td>
                      <td>{s.cctv_available === 'yes' ? 'Yes' : 'No'}</td>
                      <td>{s.toilets_available === 'yes' ? 'Yes' : 'No'}</td>
                      <td>{s.holding_account_number || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
              No data available to generate report.
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button className="btn btn--secondary" onClick={() => setIsReportModalOpen(false)}>
              {t('action.cancel')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SchoolsPage;
