var Class   = require('uclass');
var client     = require('./client');

module.exports = new Class({

  initialize:function() {
    this.clientType = {} ;
    this.clientType["tcp"] = require('./transport/tcp');
    this.clientType["ws"]  = require('./transport/ws');
  },

  getClient : function(type , options){
    if (type in this.clientType){
      var transport = new this.clientType[type](options);
      return new client(options , transport)
    }
  },

  addClient : function(name , path){
    this.clientType[name] = require(path);
  }

});