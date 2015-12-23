var Class   = require('uclass');
var client     = require('../client');
var transport  = require('../transport/ws');

var wsClient = module.exports = new Class({
  Extends  : client,

  initialize:function(options) {
    var wsTransport = new transport(options);
    wsClient.parent.initialize.call(this, options , wsTransport);
  },

});
