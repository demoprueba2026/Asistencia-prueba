const normalizeStudentIdentifier = (value) => {
  const raw = String(value ?? '').trim().toUpperCase();
  return raw.replace(/\D/g, '') || raw.replace(/[^A-Z0-9]/g, '');
};

const getStudentIdentifierVariants = (value) => {
  const raw = String(value ?? '').trim().toUpperCase();
  const normalized = normalizeStudentIdentifier(raw);
  if (!normalized) return [];

  const digits = raw.replace(/\D/g, '');
  if (!digits) return [raw];

  const prefix = raw.match(/^[VE]/)?.[0] || 'V';
  return [...new Set([
    raw,
    digits,
    `${prefix}-${digits}`,
    `${prefix}${digits}`,
    `V-${digits}`,
    `V${digits}`,
    `E-${digits}`,
    `E${digits}`,
  ])];
};

const studentIdentifierMatches = (left, right) => {
  const normalizedLeft = normalizeStudentIdentifier(left);
  return Boolean(normalizedLeft && normalizedLeft === normalizeStudentIdentifier(right));
};

module.exports = {
  getStudentIdentifierVariants,
  normalizeStudentIdentifier,
  studentIdentifierMatches,
};
