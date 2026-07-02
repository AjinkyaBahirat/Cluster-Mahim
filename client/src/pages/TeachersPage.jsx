import React, { useState, useEffect } from 'react';
import { getTeachers, createTeacher, updateTeacher, deleteTeacher } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import Modal from '../components/Modal';
import WizardForm from '../components/WizardForm';
import DataTable from '../components/DataTable';
import { Plus, Users, Edit, Trash2 } from 'lucide-react';

const TeachersPage = () => {
  const { t, language } = useLanguage();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchTeachers = async () => {
    try {
      const data = await getTeachers();
      setTeachers(data);
    } catch (err) {
      console.error(err);
      setError(t('teachers.fetch_error') || 'Failed to fetch teachers records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleOpenAdd = () => {
    setEditingTeacher(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (teacher) => {
    setEditingTeacher(teacher);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm(t('teachers.delete.confirm'))) {
      try {
        await deleteTeacher(id);
        showToast(t('teachers.deleted'));
        setLoading(true);
        fetchTeachers();
      } catch (err) {
        console.error(err);
        showToast('Failed to delete teacher record', 'error');
      }
    }
  };

  const handleSubmit = async (formData) => {
    try {
      if (editingTeacher) {
        await updateTeacher(editingTeacher.id, formData);
        showToast(t('teachers.updated'));
      } else {
        await createTeacher(formData);
        showToast(t('teachers.added'));
      }
      setIsModalOpen(false);
      setLoading(true);
      fetchTeachers();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Operation failed', 'error');
    }
  };

  const wizardSteps = [
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
  ];

  const columns = [
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
    { key: 'tet', label: t('teachers.tet') },
    {
      key: 'actions',
      label: language === 'en' ? 'Actions' : 'कृती',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn--secondary btn--sm"
            onClick={() => handleOpenEdit(row)}
            title={t('action.edit')}
          >
            <Edit size={14} />
          </button>
          <button
            className="btn btn--secondary btn--sm"
            style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
            onClick={() => handleDelete(row.id)}
            title={t('action.delete')}
          >
            <Trash2 size={14} />
          </button>
        </div>
      )
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

      <div className="page-header">
        <div>
          <h1 className="page-title">{t('teachers.title')}</h1>
          <p className="page-subtitle">{t('teachers.subtitle')}</p>
        </div>
        <button className="btn btn--primary" onClick={handleOpenAdd}>
          <Plus size={18} /> {t('teachers.add')}
        </button>
      </div>

      {loading ? (
        <div className="card">
          <div className="skeleton" style={{ height: '30px', width: '200px', marginBottom: '20px' }}></div>
          {[1, 2, 3].map((n) => (
            <div key={n} className="skeleton" style={{ height: '50px', marginBottom: '10px', borderRadius: '8px' }}></div>
          ))}
        </div>
      ) : error ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px', borderColor: 'var(--danger)' }}>
          <p style={{ color: 'var(--danger)' }}>{error}</p>
        </div>
      ) : (
        <div className="card">
          <DataTable
            columns={columns}
            data={teachers}
            searchable={true}
            searchKeys={['name', 'designation', 'phone']}
            emptyMessage={language === 'en' ? "No teachers registered in your school yet. Click 'Add Teacher' to create a record." : "शाळेत अद्याप कोणत्याही शिक्षकाची नोंद नाही. नवीन शिक्षक जोडण्यासाठी वर क्लिक करा."}
            emptyIcon={Users}
          />
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTeacher ? (language === 'en' ? 'Edit Teacher Record' : 'शिक्षकाची माहिती सुधारा') : t('teachers.add')}
      >
        <WizardForm
          key={editingTeacher ? `edit-${editingTeacher.id}` : 'add'}
          steps={wizardSteps}
          onSubmit={handleSubmit}
          onCancel={() => setIsModalOpen(false)}
          submitLabel={editingTeacher ? t('action.save') : t('action.add')}
        />
      </Modal>
    </div>
  );
};

export default TeachersPage;
