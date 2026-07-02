import axios from 'axios';

// Cache-buster comment to trigger rebuild
const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) return '/api';
  return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
};

const api = axios.create({
  baseURL: getBaseURL(),
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle authentication errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Schools API
export const getSchools = async () => {
  const res = await api.get('/schools');
  return res.data;
};

export const getSchool = async (id) => {
  const res = await api.get(`/schools/${id}`);
  return res.data;
};

export const createSchool = async (data) => {
  const res = await api.post('/schools', data);
  return res.data;
};

export const updateSchool = async (id, data) => {
  const res = await api.put(`/schools/${id}`, data);
  return res.data;
};

export const deleteSchool = async (id) => {
  const res = await api.delete(`/schools/${id}`);
  return res.data;
};

export const createHM = async (schoolId, data) => {
  const res = await api.post(`/schools/${schoolId}/create-hm`, data);
  return res.data;
};

// Teachers API
export const getTeachers = async (schoolId = null) => {
  const params = schoolId ? { school_id: schoolId } : {};
  const res = await api.get('/teachers', { params });
  return res.data;
};

export const createTeacher = async (data) => {
  const res = await api.post('/teachers', data);
  return res.data;
};

export const updateTeacher = async (id, data) => {
  const res = await api.put(`/teachers/${id}`, data);
  return res.data;
};

export const deleteTeacher = async (id) => {
  const res = await api.delete(`/teachers/${id}`);
  return res.data;
};

// Student Records (Per Standard)
export const getStudentRecords = async (schoolId = null) => {
  const params = schoolId ? { school_id: schoolId } : {};
  const res = await api.get('/students', { params });
  return res.data;
};

export const saveStudentRecords = async (records) => {
  const res = await api.post('/students', { records });
  return res.data;
};

// School Data (Aggregated Enrollment, Uniform, Books)
export const getSchoolData = async (schoolId = null) => {
  const params = schoolId ? { school_id: schoolId } : {};
  const res = await api.get('/schooldata', { params });
  return res.data;
};

export const saveSchoolData = async (data) => {
  const res = await api.post('/schooldata', data);
  return res.data;
};

export const getSchoolDataSummary = async () => {
  const res = await api.get('/schooldata/summary');
  return res.data;
};

// Dynamic Forms / Surveys
export const getForms = async () => {
  const res = await api.get('/forms');
  return res.data;
};

export const getForm = async (id) => {
  const res = await api.get(`/forms/${id}`);
  return res.data;
};

export const createForm = async (data) => {
  const res = await api.post('/forms', data);
  return res.data;
};

export const updateForm = async (id, data) => {
  const res = await api.put(`/forms/${id}`, data);
  return res.data;
};

export const deleteForm = async (id) => {
  const res = await api.delete(`/forms/${id}`);
  return res.data;
};

export const submitFormResponse = async (formId, responses) => {
  const res = await api.post(`/forms/${formId}/respond`, { responses });
  return res.data;
};

// Announcements
export const getAnnouncements = async () => {
  const res = await api.get('/announcements');
  return res.data;
};

export const createAnnouncement = async (formData) => {
  const res = await api.post('/announcements', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export const deleteAnnouncement = async (id) => {
  const res = await api.delete(`/announcements/${id}`);
  return res.data;
};

// Excel Sheets
export const getExcelSheets = async () => {
  const res = await api.get('/excel');
  return res.data;
};

export const getExcelSheetData = async (id) => {
  const res = await api.get(`/excel/${id}`);
  return res.data;
};

export const uploadExcelSheet = async (formData) => {
  const res = await api.post('/excel', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export const deleteExcelSheet = async (id) => {
  const res = await api.delete(`/excel/${id}`);
  return res.data;
};

export const toggleExcelVisibility = async (id) => {
  const res = await api.patch(`/excel/${id}/visibility`);
  return res.data;
};

// Export all school data for cluster
export const exportSchoolData = async () => {
  const res = await api.get('/export/schools');
  return res.data;
};

export default api;
