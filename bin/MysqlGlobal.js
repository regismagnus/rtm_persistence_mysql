var Class = require('jsclass/src/core').Class,
    mysql = require('mysql');

var MysqlGlobal = new Class({
    initialize: function(user, pass, server, database) {
        this.user     = user;
        this.pass     = pass;
        this.server   = server;
        this.database = database;
    },
    createQuery: function(query, queryAttrs, callback){
        if(typeof queryAttrs == 'function')
            callback = queryAttrs;
        else if(queryAttrs instanceof Array)
            query = this.format(query, queryAttrs);

        this.query = query;
        if(!callback)
            return this;

        this.execute(callback);
    },
    /*
    * @desc: retornar somente um resultado ou null
    */
    uniqueResult: function(callback){
        this.execute(function(err, rows){
            if(err) callback(err)
            else{
                if(rows && rows.length > 0){
                    callback(null, rows[0]);
                }else
                    callback(null, null);
            }
        })
    },
    execute: function(callback){
        var self = this;
        var connection = this.db_connect();

        var query = this.query;

        if(typeof this.firstResult == 'number' && typeof this.maxResults != 'number'){
            this.maxResults = 1844674407370955161;
        }

        if(typeof this.maxResults == 'number'){
            query += ' LIMIT ?';
            query = this.format(query, [this.maxResults]);
        }

        if(typeof this.firstResult == 'number'){
            query += ' OFFSET ?';
            query = this.format(query, [this.firstResult]);
        }
        //console.log(query);
        connection.query('use ' + self.database);
        connection.query(query, function(err, rows, fields) {
            if(rows instanceof Array){
                if(self.resultTransformer && typeof self.resultTransformer.transformTuple == 'function'){
                    for(var i in rows)
                        rows[i] = self.resultTransformer.transformTuple(rows[i]);
                }
            }
            connection.end();
            callback(err, rows);
        });
    },
    /*
    * @params: int n
    */
    setFirstResult: function(n){
        this.firstResult = n;
    },
    /*
    * @params: int n
    */
    setMaxResults: function(n){
        if(typeof this.firstResult != 'number')
            this.firstResult = 0;
        this.maxResults = n;
    },
    /*
    * @params: Class k
    */
    setResultTransformer: function(k){
        this.resultTransformer = k;
    },
    escape: function(value){
        var connection = this.db_connect();
        value = connection.escape(value);
        connection.end();

        return value;
    },
    format: function(query, attr){
        return mysql.format(query, attr);
    },
    db_connect: function(){
        var self = this;

        var connection = mysql.createConnection({
            host     : self.server,
            user     : self.user,
            password : self.pass
        });

        connection.connect();

        return connection;
    }
});

module.exports = MysqlGlobal;
