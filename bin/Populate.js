var Class = require('jsclass/src/core').Class;

/*
 * @Desc: Adicionar entidades e subEntidades para ser buscada em banco e populada
 * ex: Tenho informacoes de ObjectMySQL para ser colocada na entidade
 * enviar Populate em EntityDB.populate para carregar subEntidades tamb�m caso seja necessario
 * 'ObjectMySQL', { ObjectMySQLSubEntity: null }
 */
var Populate = new Class({
    initialize: function() {
        this.entities = {};
    },
    /*
    * @params: entity String, subEntities object
    */
    add: function(entity, subEntities){
        subEntities = (!subEntities ? null : this.convertToPopulate(subEntities));

        this.entities[entity] = subEntities;
    },
    /*
    * @params: entities object
    * @return: Populate
    */
    convertToPopulate: function(entities){
        var newPopulate = new Populate();
        for(var i in entities){
            newPopulate.add(i, entities[i]);
        }
        return newPopulate;
    },
    /*
    * @params: entity String
    * @return: Populate
    */
    get: function(entity){
        for(var i in this.entities){
            if(entity == i)
                return this.entities[i];
        }
        return null;
    },
    /*
    * @params: entity String
    * @return: boolean
    */
    has: function(entity){
        for(var i in this.entities){
            if(entity == i)
                return true;
        }
        return false;
    }
});

module.exports = Populate;