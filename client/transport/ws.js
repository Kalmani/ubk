var Class = require('uclass');
var Options   = require('uclass/options');

var WebSocket = require('ws');

module.exports = new Class({
  Implements : [Options, require("uclass/events")],

  Binds : [
    'receive',
    'connect',
    'write',
  ],

  options : {
    server_hostaddr         : '127.0.0.1',
    server_port             : 8001,
  },

  url     : '',
  _socket : null,

  initialize : function(options) {
    this.setOptions(options);
  },

  connect : function(onconnection, ondeconnection , server_addr){

    this.url     = server_addr.replace('http','ws') ;
    this._socket = new WebSocket(this.url)  ;

    this._socket.onClose   = ondeconnection ;
    this._socket.onError   = ondeconnection ;
    this._socket.ondisconnect = ondeconnection ;
    this._socket.onmessage = this.receive   ;
    this._socket.onopen    = onconnection   ;
  },

  write : function(data){
    try{
      this._socket.send(JSON.stringify(data));
    }catch(e){
      console.log("can't write in the _socket" , e) ;
    }
  },

  // Received a message
  receive : function(message) {
    var data ;
    try {
      data = JSON.parse(message.data);
    } catch(e) {
      console.log("Parsing response failed: "+e);
    }
    if(data)
      this.emit("message" ,data);
  },

  disconnect : function(){
    try {
      this._socket.close();
    } catch(e) {
      console.log("cant't close socket : "+e);
    }
  }

});
