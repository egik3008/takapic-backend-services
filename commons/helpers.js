module.exports.createUIDChars = function(strEmail) {
  const rgxPatt = /[._@]+/g;
  return strEmail.replace(rgxPatt, '-');
};
