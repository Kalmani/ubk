var ws = require('ws') ;
var guid    = require('mout/random/guid');
var Class   = require('uclass');

module.exports = new Class({
  Implements : [require("uclass/events")],

  Binds : [
    'receive',
    'disconnect',
    'send',
    'export_json',
  ],
  _stream : null,
  initial_lnk : null,
  id : '',

    initialize : function(stream) {

    //this.id = stream.id;
    this._stream = stream
    var self = this ;

    var disconnect = function(){self.emit("disconnect");}

    this.initial_lnk = this.export_json();
    this._stream.on('message' , this.receive);
    this._stream.on('error',  disconnect);
    this._stream.on('close',  disconnect);
    this._stream.on('disconnect', disconnect);

  },

  // Export device configuration
  export_json : function(){
    if(!this._stream)
      return null;
    return {
      type    : 'websocket',
      secured : false,
      address : this._stream.upgradeReq.connection.remoteAddress,
      port :  this._stream.upgradeReq.connection.remotePort,
      network:  this._stream.upgradeReq.headers.host.split(':')[0] // ip:port (sometimes)
    }
  },

  // Received some data from web socket
  // Propagate them
  receive : function(chars){
    var data = null;
    try {
      data = JSON.parse(chars);
    } catch(e) {
      console.log("Bad data, not json", chars);
    }
    if(data)
      this.emit('message' , data);
  },

  // Send some data over the web socket
  write : function(data){
    try{
      this._stream.send(JSON.stringify(data));
    } catch(e) {
      console.log("Failed to write in tcp client. "+e);
    }
  },

  disconnect : function(){
    try {
      this._stream.close(function(){});
    } catch(e) {
      console.log("cant't close socket : "+e);
    }
  }

})
