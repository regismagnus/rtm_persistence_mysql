var Class = require('jsclass/src/core').Class,
    async = require('async'),
    EntityDB = require('./EntityDB'),
    MysqlGlobal = require('./MysqlGlobal');

var EntityGlobalDBFunction = function(){
    var _user     = null;
    var _pass     = null;
    var _server   = null;
    var _database = null;

    var _annotations = null;

    var EntityGlobalDB = new Class(EntityDB(), {
        initialize: function(user, pass, server, annotations) {
            if(typeof user == 'object')
                annotations = user;
            _annotations = annotations;
            _user        = user;
            _pass        = pass;
            _server      = server;
            _database    = _annotations.catalog;

            this.callSuper(user, pass, server, annotations);
        },
        /*
        * abstract
        */
        annotations: {/*implements in class*/},
        find: function(args, callback){
            var mysql = new MysqlGlobal(_user, _pass, _server, _database);

            var select = 'SELECT * FROM `' + _annotations.table + '` ' + _annotations.alias;

            mysql.createQuery(select, callback);
        },
        findById: function(populate, callback){
            if(!this[_annotations.pk] && !this[_annotations.refPk]){
                callback();
                return;
            }

            var selectAttr = [];
            selectAttr.push(_annotations.table);

            if(_annotations.pk instanceof Array && !this[_annotations.refPk]){
                for(var i in _annotations.pk){
                    selectAttr.push(_annotations.entities[_annotations.pk[i]]);
                    selectAttr.push(this[_annotations.pk[i]]);
                }
            }else if(typeof _annotations.entities[_annotations.pk] == 'object'
                    && _annotations.entities[_annotations.pk].entity && !this[_annotations.refPk]){
                        var whereReference = this[_annotations.pk];
                        for(var i in whereReference.annotations.pk){
                            selectAttr.push(whereReference.annotations.entities[whereReference.annotations.pk[i]]);
                            selectAttr.push(whereReference[whereReference.annotations.pk[i]]);
                        }
                    }else if(!this[_annotations.refPk]){
                        selectAttr.push(_annotations.entities[_annotations.pk]);
                        selectAttr.push(this[_annotations.pk]);
                    }else{
                        selectAttr.push(_annotations.entities[_annotations.refPk]);
                        selectAttr.push(this[_annotations.refPk]);
                    }

            this.executeOneOrNull(selectAttr, populate, callback);
            /*var mysql = new MysqlGlobal(_user, _pass, _server, _database);

            var select = 'SELECT * FROM ?? WHERE 1';

            var serialCache = "";
            for(var i = 1; i < selectAttr.length; i++){
                if(!selectAttr[i]){
                    callback();
                    return;
                }

                serialCache += selectAttr[i];

                if(i % 2 > 0)
                    select += ' AND ?? = ?';
            }

            if(this.cache[serialCache])

            select = mysql.format(select, selectAttr);

            var self = this;
            mysql.createQuery(select, function(err, results){
                if(err) throw err;
                else if(results.length > 0)
                    self.populate(results[0], populate, callback);
                else{
                    self.populate(null, null, callback);
                    //throw new Error('Nothing found in ' + _annotations.table + ' whith PK value ' + self[_annotations.pk]);
                }
            });*/
        },
        /*
        * @params: Array of String ref, Populate populate
        * @desc: Set entity by ref
        */
        findOneByRef: function(ref, populate, callback){
            if(!(ref instanceof Array) || ref.length == 0){
                callback();
                return;
            }

            var selectAttr = [];
            selectAttr.push(_annotations.table);

            for(var i in ref){
                var auxRefPk = ref[i].split('.');

                if(auxRefPk.length == 1){
                    if(typeof _annotations.entities[ref[i]] == 'string'){
                        selectAttr.push(_annotations.entities[ref[i]]);
                        selectAttr.push(this[ref[i]]);
                    }else if(typeof _annotations.entities[ref[i]] == 'object'){
                        selectAttr.push(_annotations.entities[ref[i]].name);
                        selectAttr.push(this[ref[i]]);
                    }
                }else{
                    var reference = this[auxRefPk[0]];

                    if(typeof reference[auxRefPk[1]] == 'string'){
                        selectAttr.push(reference.annotations.entities[auxRefPk[1]]);
                        selectAttr.push(reference[auxRefPk[1]]);
                    }else{
                        selectAttr.push(reference.annotations.entities[auxRefPk[1]].name);
                        selectAttr.push(reference[auxRefPk[1]]);
                    }
                }
            }

            if(selectAttr.length == 1){
                callback();
                return;
            }

            this.executeOneOrNull(selectAttr, populate, callback);
            /*var mysql = new MysqlGlobal(_user, _pass, _server, _database);

            var select = 'SELECT * FROM ?? WHERE 1';

            for(var i = 1; i < selectAttr.length; i++){
                if(!selectAttr[i]){
                    callback();
                    return;
                }
                if(i % 2 > 0)
                    select += ' AND ?? = ?';
            }
            select = mysql.format(select, selectAttr);

            var self = this;
            mysql.createQuery(select, function(err, results){
                if(err) throw err;
                else if(results.length > 0)
                    self.populate(results[0], populate, callback);
                else{
                    self.populate(null, null, callback);
                    //throw new Error('Nothing found in ' + _annotations.table + ' whith PK value ' + self[_annotations.pk]);
                }
            });*/
        },
        /*
        * @params: Array of string, Populate populate
        * @desc: execute queries
        */
        executeOneOrNull: function(selectAttr, populate, callback){
            var mysql = new MysqlGlobal(_user, _pass, _server, _database);

            var select = 'SELECT * FROM ?? WHERE 1';

            var serialCache = "";
            for(var i = 1; i < selectAttr.length; i++){
                if(!selectAttr[i]){
                    callback();
                    return;
                }

                serialCache += selectAttr[i] + "_";

                if(i % 2 > 0)
                    select += ' AND ?? = ?';
            }

            if(typeof this._cache == 'object' && this._cache[serialCache]){
                this.resultExecuteOneOrNull(null, this._cache[serialCache], populate, callback);
                return;
            }


            select = mysql.format(select, selectAttr);

            var self = this;
            mysql.createQuery(select, function(err, results){
                if(!err && self._cache)
                    self._cache[serialCache] = results;
                self.resultExecuteOneOrNull(err, results, populate, callback);
            });
        },
        /*
        * @params: Error err, Array of string, Populate populate
        * @desc: set and return results
        */
        resultExecuteOneOrNull: function(err, results, populate, callback){
            if(err){
                if(typeof callback == 'function'){
                    callback(err);return;
                }else
                    throw err;
            }
            else if(results.length > 0)
                this.populate(results[0], populate, callback);
            else{
                if(typeof callback == 'function')
                    callback(new Error('NothingFound'));
                else
                    throw new Error('Nothing found in ' + _annotations.table + ' with PK value ' + this[_annotations.pk]);
            }
        },
        /*
        * @params: where String
        * @Desc: Find all entities by where or entity
        */
        findAll: function(where, populate, classClone, callback){
            var mysql = new MysqlGlobal(_user, _pass, _server, _database);

            var selectAttr = [];
            selectAttr.push(_annotations.table);

            if(!where){
                for(var i in _annotations.entities){
                    if(this[i] && (typeof _annotations.entities[i] == 'string'
                        || (typeof _annotations.entities[i] == 'object' && typeof _annotations.entities[i].entity == 'undefined'))){
                            var collName = (typeof _annotations.entities[i] == 'string' ? _annotations.entities[i] : _annotations.entities[i].name);

                            selectAttr.push(collName);
                            selectAttr.push(this[i]);
                    }else if(this[i] && _annotations.pk == i){
                        for(var b in this[i].annotations.pk){
                            if(this[i][this[i].annotations.pk[b]]){
                                var collName = (typeof this[i].annotations.entities[this[i].annotations.pk[b]] == 'string'
                                                ? this[i].annotations.entities[this[i].annotations.pk[b]]
                                                : this[i].annotations.entities[this[i].annotations.pk[b]].name);

                                selectAttr.push(collName);
                                selectAttr.push(this[i][this[i].annotations.pk[b]]);
                            }
                        }
                    }
                }
            }else if(where instanceof Array){
                where.unshift(_annotations.table);
                selectAttr = where;
            }

            var select = 'SELECT * FROM ?? WHERE 1';

            for(var i = 1; i < selectAttr.length; i++){
                if(i % 2 > 0)
                    select += ' AND ?? = ?';
            }
            select = mysql.format(select, selectAttr);

            var self = this;
            mysql.createQuery(select, function(err, results){
                if(err){
                    callback(err);return;
                }

                var arrFindAll = [];
                if(!populate){
                    for(var i in results){
                        var clone = new classClone(_user, _pass, _server);

                        clone.populate(results[i]);
                        arrFindAll.push(clone);
                    }
                    callback(err, arrFindAll);
                }else{
                    async.mapLimit(results, 1,
                        function(item, cb){
                            var clone = new classClone(_user, _pass, _server);

                            if(self._cache)
                                clone.setCache(self._cache);
                            clone.populate(item, populate, function(){
                                arrFindAll.push(clone);
                                setImmediate(cb);
                            });
                        }, function(err){
                            callback(err, arrFindAll);
                        }
                    );
                }
            });
        }
    });

    return EntityGlobalDB;
}

module.exports = EntityGlobalDBFunction;
