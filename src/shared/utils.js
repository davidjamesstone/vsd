exports.rndstr = function() {
  return (+new Date()).toString(36);
};

exports.getuid = function() {
  //return ('' + Math.random()).replace(/\D/g, '');
  return Math.round((Math.random() * 1e7)).toString();
};
