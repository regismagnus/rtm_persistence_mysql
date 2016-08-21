var path    = require('path'),
    rtmPersistenceMysql = (typeof this.nsTnwCore === 'undefined') ? {} : this.nsTnwCore;
rtmPersistenceMysql.Date = Date;

(function(factory) {
    module.exports = rtmPersistenceMysql;

    factory(rtmPersistenceMysql);
})(function(exports){
'use strict';

/*
* Return class
*/
exports.EntityGlobalDB = require(path.dirname(__filename) + '/EntityGlobalDB');

/*
* Return class
*/
exports.Populate =  require(path.dirname(__filename) + '/Populate');
/*
* Return class
*/
exports.MysqlGlobal =  require(path.dirname(__filename) + '/MysqlGlobal');

});
