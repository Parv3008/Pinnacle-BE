export const generateCode = (prefix, sequence) => {
  const padded = String(sequence).padStart(5, '0');
  return `${prefix}${padded}`;
};

export const normalizeMobile = (mobile) => {
  if (!mobile) return '';
  return String(mobile).replace(/\D/g, '').slice(-10);
};
