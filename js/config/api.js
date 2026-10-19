const SENDER_WHATSAPP_NUMBER = '04142475155';
const DEFAULT_PHONE = '04125486575';
const DEFAULT_MESSAGE = 'La estudiante Arianny Suarez está asistente';
const API_BASE_URL = window.location.protocol === 'file:' ? 'http://localhost:3000' : window.location.origin;
const API_SEND_WHATSAPP = `${API_BASE_URL}/api/send-whatsapp`;
const API_SEND_EMAIL = `${API_BASE_URL}/api/send-email`;
const API_STUDENTS = `${API_BASE_URL}/api/students`;
const API_ATTENDANCE = `${API_BASE_URL}/api/attendance`;
const API_SEND_DAILY_EMAILS = `${API_BASE_URL}/api/cron-daily-emails`;
const deletedStudentIds = new Set();

