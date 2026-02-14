const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

const validatePassword = (password) => {    
  return password.length >= 8;
}

const validateRFC = (rfc) => {
  const rfcRegex = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;
  return rfcRegex.test(rfc);
}

const validateYear = (year) => {
  const currentYear = new Date().getFullYear();
  return year >= 1900 && year <= currentYear;
}

const validateMonth = (month) => {
  return month >= 1 && month <= 12;
}

module.exports = { validateEmail,
  validateRFC,
  validateYear,
  validateMonth,
  validatePassword
};