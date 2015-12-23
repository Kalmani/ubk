"use strict";

var Class   = require('uclass');
var Options   = require('uclass/options');

var once    = require('nyks/function/once');
var guid    = require('mout/random/guid');
var merge   = require('mout/object/merge');

var cmdsDispatcher  = require('../lib/cmdsDispatcher')

module.exports = new Class({

  Implements : [Options, require("uclass/events"), cmdsDispatcher],

  Binds : [
    'respond',
    'send',
    'onMessage',
    'connect',
    'disconnect',
  ],

  options : {
    ping                    : true,
    handelPing              : true,
    regisration             : true,
    registration_parameters : {},
  },

  client_key  : null,
  _transport  : null,
  _call_stack : {},


  initialize:function(options , transport) {

    var self = this;

    this._transport = transport;
    this._transport.on("message" , this.onMessage);

    options = options || {};
    this.setOptions(options);
    this.client_key  = options.client_key || guid();

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

    if(this.options.handelPing)
      this.register_cmd('base', 'ping', function(client, query){
        return client.respond(query, "pong");
      });
  },


  respond : function(query, response, error){
    query.response = response;
    query.error    = error;
    delete query.args;
    delete query.ns;
    delete query.cmd;
    this._transport.write(query);
  },

  // Send a command with some args to the server
  send : function(ns, cmd, args, callback){
    var quid = guid();

    var query = {
      ns   : ns,
      cmd  : cmd,
      quid : quid,
      args : args
    };

    if(callback)
      this._call_stack[quid] = callback;

    this._transport.write(query);
  },

  connect : function(onconnect, ondisconnect , server_addr){
    var self = this ;
    console.log("Connecting as %s", this.client_key);
    if(!onconnect)
      onconnect = Function.prototype;
    if(!ondisconnect)
      ondisconnect = Function.prototype;

    var chain = onconnect ;

    if(this.options.regisration)
      onconnect = function(){
        console.log('sneding registration')
        self.send('base', 'register', merge({client_key : self.client_key}, self.options.registration_parameters), function(){
          console.log('Client has been registered');
          chain();
        });
      }
    onconnect    = once(onconnect);
    ondisconnect = once(ondisconnect);

    this._transport.connect(onconnect , ondisconnect , server_addr);
  },

  onMessage : function(data){
    console.log("Received >>");
    console.log(data);
    // Local call stack
    if(data.quid in this._call_stack) {
      this._call_stack[data.quid](data.response, data.error);
      delete this._call_stack[data.quid];
      return;
    }

    this.emit("message", data);
    this._dispatch(this, data);
  },


  disconnect : function(){
    this._transport.disconnect();
  }

});