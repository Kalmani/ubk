var Class   = require('uclass');
var Options   = require('uclass/options');

var client     = require('./client');


module.exports = new Class({

    initialize:function(options) {
        this.clientType = {} ;
        this.clientType["tcp"] = require('./transport/tcp');
        this.clientType["ws"]  = require('./transport/ws');
    },

    getClient : function(type , options , stream){
        if (type in this.clientType){
            var transport = new this.clientType[type](stream);
            return new client(options , transport)
        }
    },

    addClient : function(name , path){
        this.clientType[name] = require(path);
    }

});