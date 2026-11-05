const sendEmail = require('../send-email');
const { requireStaff } = require('../lib/security');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const staffUser = await requireStaff(req, res, 'students.write');
  if (!staffUser) return;
  return sendEmail(req, res);
};
