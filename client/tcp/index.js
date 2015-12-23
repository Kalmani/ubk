var Class   = require('uclass');

var client     = require('../client');
var transport  = require('../transport/tcp');


var tcpClient = module.exports = new Class({
  Extends  : client,

  initialize:function(options) {
    var tcpTransport = new transport(options);
    tcpClient.parent.initialize.call(this, options, tcpTransport);
  },

});
