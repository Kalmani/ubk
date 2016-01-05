var Class   = require('uclass');
var guid    = require('mout/random/guid');

var cmdsDispatcher  = require('../lib/cmdsDispatcher')


var Client = module.exports = new Class({
  Implements : [ require("uclass/events"), cmdsDispatcher],
  Binds : [
    'receive',
    'disconnect',
    'send',
    'call_rpc',
  ],

  options : {
    ping                    : true,
    handelPing              : true,
  },

  // Identification
  client_key : null,
  registration_time : null,

  // Network : tcp or websocket
  network_client : null,

  // Commands sent
  call_stack : {},

  initialize : function(options, network_client){
    var self = this;

    this.network_client = network_client;

    var disconnect = function(){self.emit("disconnect");}
    this.network_client.on('message'   ,  this.receive);
    this.network_client.on('disconnect',  disconnect);

    if(this.options.ping){
      var intervalTime = self.options.pingInterval || 5000 ;
      var connected = true ;
      self._heartbeat =  setInterval(function(){
        if(!connected)
          return self.disconnect();
        connected = false;
        self.send("base" , "ping" , {}, function(response){
          connected = true ;
        })
      }, intervalTime)
    }

    if(this.options.handelPing){
      this.register_cmd('base', 'ping', function(client, query){
        return client.respond(query, "pong");
      });
    }
  },


  // Export client configuration
  export_json : function(){
    return {
      client_key    : this.client_key,
      registration_time : Math.floor(this.registration_time/1000),
      uptime: Math.floor((Date.now() - this.registration_time) / 1000),
      //networkclient is canceled on disconnected clients
      remoteAddress : this.network_client ? this.network_client.export_json() : {},
    };
  },



  // React to received data
  receive : function(data){

    // Debug
    console.log("Received ", data, " from client", this.client_key);

    // Use stored callback from call stack
    if(data.quid in this.call_stack) {
      this.call_stack[data.quid](data.response, data.error);
      delete this.call_stack[data.quid];
      return;
    }

    this.emit('message', data);

    this._dispatch(this, data);
  },


  call_rpc : function(ns, cmd, args, callback){
    this.send(ns, cmd, args, function(response, error){
      callback.call(null, error, response);
    });
  },

  // Send a command to client, callback is not mandatory for signals
  send : function(ns, cmd, args, callback){
    if(!(ns == 'base' && cmd == 'ping'))
      console.log("Send msg '%s:%s' to %s ", ns, cmd, this.client_key);

    var quid = guid();

    var query = {
      ns : ns,
      cmd : cmd,
      quid : quid,
      args : args
    };

    if(callback)
      this.call_stack[quid] = callback;
    this.network_client.write(query);
  },


  // Low Level send raw JSON
  respond: function(query, response){
    if(!this.network_client)
      return;
    query.response = response;
    delete query.args;
    this.network_client.write(query);
  },

  // Network client got disconnected, propagate
  disconnect : function(){
    this.network_client.disconnect();
  },


});
