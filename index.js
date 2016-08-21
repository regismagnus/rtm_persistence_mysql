var path    = require('path');

_NSTNWCORE_PATH = path.dirname(__filename) + '/bin';
module.exports = require(_NSTNWCORE_PATH + '/loader');

