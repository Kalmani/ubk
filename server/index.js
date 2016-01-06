var tls   = require('tls'),
  net   = require('net');

var Class   = require('uclass');
var Options = require('uclass/options');
var wsServer= require('ws').Server
var http    = require('http');
var cmdsDispatcher = require('../lib/cmdsDispatcher')
var cliensManager = require('../lib/cliensManager')


var Server = module.exports = new Class({

  Implements : [cliensManager],

  Binds : [
    'start_tcp_server',
    'start_socket_server',
  ],

  options : {
    'secured'       : false,
    'server_port'   : 8000,
    'socket_port'   : 8001,
  },


  initialize:function(options) {
    this.setOptions(options);
  },


  start_socket_server : function(server , path){
    var self = this;
    if(!server)
      server = http.createServer().listen(self.options.socket_port, function(){
        console.log("start default server on port %s" , self.options.server_port);
      })
    if(!path)
      path = "/";

      var web_sockets = new wsServer({
      server: server,
      path : path,
    });
    web_sockets.on('connection', function(stream){
      self.new_client("ws" , null , stream);
    });
  },


  start_tcp_server : function(chain){
    var self = this;

    if(this.options.secured) {
      var tls_options = {
        requestCert: true,
        rejectUnauthorized : true,
        key :  null,
        cert : null,
        ca : [ null ]
      };
      this.tcp_server = tls.createServer(tls_options, function(stream){
        self.new_client("tcp" , null , stream);
      });
    } else {
      this.tcp_server = net.createServer(function(stream){
        self.new_client("tcp" , null , stream);
      });
    }

    var server_port = this.options.server_port;

    this.tcp_server.listen(server_port, function(){
      console.log("Started TCP server for clients on port %d", server_port);
      chain();
    });
  },

});
