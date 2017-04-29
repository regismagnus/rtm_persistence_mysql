var Class = require('jsclass/src/core').Class,
    async = require('async'),
    Populate = require('./Populate');

/*
 * abstract class
 */
var EntityDBFunction = function(){
    var _user   = null;
    var _pass   = null;
    var _server = null;

    var _annotations = null;

    var EntityDB = new Class({
        initialize: function(user, pass, server, annotations) {
            if(typeof user == 'object')
                annotations = user;
            _annotations = annotations;
            _user        = user;
            _pass        = pass;
            _server      = server;
        },
        /*
         * @params: object cache
         */
        setCache: function(cache){
            if(typeof cache != 'object')
                throw new Error('Cache need object param');
            this._cache = cache;
        },
        /*
         * @params object Object, populate Array of string, find boolean
         * @Desc: Set class with base the annotations entities
         */
        populate: function(object, populate, find, callback){
            if(typeof find == 'function'){
                callback = find;
                find = false;
            }

            if(!object){
                if(typeof callback == 'function'){
                    callback(new Error('Not found'));
                }
                return;
            }

            if(typeof object != 'object')
                throw new Error("Object in populate not is object");

            if(populate instanceof Populate && typeof callback != 'function')
                throw new Error('Need callback function for populate others entities');

            if(object._pk || object._refPk){
                if(object._pk instanceof Array){
                    if(_annotations.pk instanceof Array && !object._refPk){
                        for(var i in _annotations.pk)
                            this[_annotations.pk[i]] = object._pk[i];
                    }else if(typeof _annotations.entities[_annotations.pk] == 'object'
                        && _annotations.entities[_annotations.pk].entity && !object._refPk){

                        var referencePk = new _annotations.entities[_annotations.pk].entity(_user, _pass, _server);
                        for(var i in referencePk.annotations.pk)
                            referencePk[referencePk.annotations.pk[i]] = object._pk[i];

                        this[_annotations.pk] = referencePk;
                    }else if(object._refPk){
                        for(var b in object._refPk){
                            var auxRefPk = object._refPk[b].split('.');

                            if(auxRefPk.length == 1)
                                this[object._refPk[b]] = object._pk[b];
                            else{
                                var reference;
                                if(!this[auxRefPk[0]])
                                    reference = new _annotations.entities[auxRefPk[0]].entity(_user, _pass, _server);
                                else
                                    reference = this[auxRefPk[0]];

                                reference[auxRefPk[1]] = object._pk[b];
                                this[auxRefPk[0]] = reference;
                            }
                        }

                        if(find && typeof callback == 'function'){
                            this.findOneByRef(object._refPk, populate, callback);
                            find = false;
                        }
                    }

                    if(find && typeof callback == 'function'){
                        this.findById(populate, callback);
                    }
                }else{
                    this[_annotations.pk] = object._pk;
                    if(object._refPk){
                        this[object._refPk.coll] = object._refPk.value;
                    }
                    if(find && typeof callback == 'function'){
                        this.findById(populate, callback);
                    }
                }
                return;
            }

            if(populate instanceof Populate)
                this.populateAsync(object, populate, callback);
            else
                this.populateSync(object, callback);
        },
        /*
         * @params object Object
         * @Desc: Set class with base the annotations entities
         */
        populateSync: function(object, callback){
            for(var i in _annotations.entities){
                if(typeof _annotations.entities[i] == 'string'
                    && typeof object[_annotations.entities[i]] != 'undefined')
                    this[i] = object[_annotations.entities[i]];
                else if(typeof _annotations.entities[i] == 'object'
                    && _annotations.entities[i].entity
                    && (typeof object[_annotations.entities[i].name] != 'undefined'
                    || _annotations.entities[i].name instanceof Array)){
                    var reference = new _annotations.entities[i].entity(_user, _pass, _server);

                    if(this._cache)
                        reference.setCache(this._cache);

                    if(typeof reference.populate == 'function'){
                        var pk    = null;
                        var refPk = null;
                        if(_annotations.entities[i].name instanceof Array){
                            pk = [];
                            for(var b in _annotations.entities[i].name)
                                pk.push(object[_annotations.entities[i].name[b]]);

                            if(_annotations.entities[i].refColl && _annotations.entities[i].refColl instanceof Array
                                && _annotations.entities[i].refColl.length == _annotations.entities[i].name.length){
                                refPk = _annotations.entities[i].refColl;
                            }
                        }else if(_annotations.entities[i].refColl){
                            refPk = {value: object[_annotations.entities[i].name], coll: _annotations.entities[i].refColl}
                        }else
                            pk = object[_annotations.entities[i].name];

                        reference.populate({
                            _pk: pk,
                            _refPk: refPk
                        });

                        if(!reference.isPKSetted())
                            reference = null;
                        this[i] = reference;
                    }
                }else if(typeof _annotations.entities[i] == 'object'
                    && (_annotations.entities[i].type == 'date' || _annotations.entities[i].type == 'Date')
                    && object[_annotations.entities[i].name]){
                    this[i] = new Date(object[_annotations.entities[i].name]);
                }else
                    this[i] = null;
            }
            if(typeof callback == 'function')
                callback();
        },
        /*
         * @params object Object, populate Array of string
         */
        populateAsync: function(object, populate, callback){
            var self = this;
            var arrKeys = [];
            for(var i in _annotations.entities)
                arrKeys.push(i);

            async.map(arrKeys,
                function(key, cb){
                    var item = _annotations.entities[key];
                    var callPopulate = false;

                    if(typeof item == 'string'
                        && typeof object[item] != 'undefined')
                        self[key] = object[item];
                    else if(typeof item == 'object'
                        && item.entity
                        && (typeof object[item.name] != 'undefined'
                        || (item.name instanceof Array && item.type != 'oneToMany'))){
                        var reference = new item.entity(_user, _pass, _server);

                        if(self._cache)
                            reference.setCache(self._cache);

                        var pk = null;
                        var refPk = null;
                        if(item.name instanceof Array){
                            pk = [];
                            for(var b in item.name)
                                pk.push(object[item.name[b]]);

                            if(item.refColl && item.refColl instanceof Array && item.refColl.length == item.name.length){
                                refPk = item.refColl;
                            }
                        }else if (item.refColl)
                            refPk = {value: object[item.name], coll: item.refColl}
                        else
                            pk = object[item.name];

                        if(populate.has(key)){
                            callPopulate = true;

                            reference.populate({_pk: pk, _refPk: refPk}, populate.get(key), true, function(){
                                if(!reference.isPKSetted())
                                    reference = null;
                                self[key] = reference;
                                setImmediate(cb);
                            });
                        }else{
                            if(typeof reference.populate == 'function'){
                                reference.populate({_pk: pk, _refPk: refPk}, cb);
                            }
                            if(!reference.isPKSetted())
                                reference = null;
                            self[key] = reference;
                        }
                    }else if(typeof item == 'object'
                        && (item.type == 'date' || item.type == 'Date')
                        && object[item.name]){
                        self[key] = new Date(object[item.name]);
                    }else if(typeof item == 'object' && item.refPk && item.entity && item.type == 'oneToMany'){
                        if(typeof item.entity == 'string')
                            item.entity = require(item.entity);
                        var reference = new item.entity(_user, _pass, _server);

                        if(self._cache)
                            reference.setCache(self._cache);

                        var referencePopulate = null;
                        if(populate.has(key))
                            referencePopulate = populate.get(key);

                        var referenceWhere = [];
                        if(item.refPk instanceof Array && _annotations.pk instanceof Array
                            && item.refPk.length == _annotations.pk.length){
                            for(var i in item.refPk){
                                referenceWhere.push(item.refPk[i]);
                                referenceWhere.push(self[_annotations.entities[_annotations.pk[i]]]);
                            }
                        }else{
                            referenceWhere.push(item.refPk);
                            referenceWhere.push(self[_annotations.entities[_annotations.pk]]);
                        }

                        reference.findAll(referenceWhere, referencePopulate, item.entity, function(err, entities){
                            if(err){
                                self[key] = [];
                                console.log('Err to find oneToMany ' + key + ' to table ' + _annotations.table);
                            }else{
                                self[key] = entities;
                            }
                            setImmediate(cb);
                        }, key);
                        return;
                    }else
                        self[key] = null;

                    if(!callPopulate)
                        setImmediate(cb);

                }, function(){
                    callback();
                }
            );
        },
        /*
         * @desc: return entity pk
         */
        getPK: function(){
            return _annotations.pk;
        },
        /*
         * @desc: return entity pk
         */
        getPKTableName: function(){
            var pk = _annotations.pk;

            if(pk instanceof Array){
                var pks = [];
                for(var i in pk){
                    if(typeof _annotations.entities[pk[i]] == 'string')
                        pks.push(_annotations.entities[pk[i]]);
                    else if(_annotations.entities[pk[i]] && _annotations.entities[pk[i]].name)
                        pks.push(_annotations.entities[pk[i]].name);
                }
                return pks;
            }

            if(typeof _annotations.entities[pk] == 'string')
                return _annotations.entities[pk];
            else if(_annotations.entities[pk] && _annotations.entities[pk].name)
                return _annotations.entities[pk].name;
            return null;
        },
        /*
         * abstract
         */
        find: function(args, callback){
            /*implements in class*/
        },
        /*
         * abstract
         */
        findById: function(callback){
            /*implements in class*/
        },
        /*
         * abstract
         */
        findOneByRef: function(ref, populate, callback){
            /*implements in class*/
        },
        /*
         * @Desc: Save Entity
         */
        save: function(callback){
            if(this[_annotations.pk])
                this.update(callback);
            else
                this.insert(callback);
        },
        /*
         * abstract
         */
        insert: function(callback){
            /*implements in class*/
        },
        /*
         * abstract
         */
        update: function(callback){
            /*implements in class*/
        },
        /*
         * @return: boolean
         * @desc: Verifica se Pk esta setada em entidade
         */
        isPKSetted: function(){
            if(_annotations.pk instanceof Array){
                for(var i in _annotations.pk){
                    var pkSetted = !(typeof this[_annotations.pk[i]] == 'undefined' || this[_annotations.pk[i]] == null);

                    if(!pkSetted)
                        return false;
                }

                return true;
            }else{
                return (typeof this[_annotations.pk] != 'undefined' && this[_annotations.pk] != null)
            }
        },
        /*
         * @params: object entity_object
         * @desc: Set entity by object
         */
        setEntityByObject: function(entity_object){
            if(!entity_object)
                return;

            for(var i in _annotations.entities){
                if(!_annotations.entities[i].entity && !_annotations.type != 'Date')
                    this[i] = entity_object[i];
                else if(_annotations.type == 'Date'){
                    if(typeof entity_object[i] == 'string')
                        this[i] = new Date(entity_object[i]);
                    else if(entity_object[i] instanceof Date)
                        this[i] = entity_object[i];
                    else
                        this[i] = null;
                }else if(typeof _annotations.entity == 'string'){
                    var Reference = require(_annotations.entity);
                    this[i] = new Reference().setEntityByObject(entity_object[i]);
                }else if(_annotations.entity)
                    this[i] = new _annotations.entity().setEntityByObject(entity_object[i]);
            }
        },
        extend: function(target) {
            var sources = [].slice.call(arguments, 1);
            sources.forEach(function (source) {
                for (var prop in source) {
                    target[prop] = source[prop];
                }
            });
            return target;
        }
    });

    return EntityDB;
}

module.exports = EntityDBFunction;
