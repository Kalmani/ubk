var Class   = require('uclass');
var Options = require('uclass/options');
var net     = require('net');
var tls     = require('tls');
var indexOf = require('mout/array/indexOf');
var merge   = require('mout/object/merge');


module.exports = new Class({
  Implements : [Options, require("uclass/events")],

  Binds : [
    'connect',
    '_build_tls_socket',
    '_build_net_socket',
    'receive',
    'write',
    'disconnect',
  ],

  options : {
    server_hostaddr         : '127.0.0.1',
    server_port             : 8000,
  },

  // Network protocol
  Delimiter : 27,

  _socket : null,
  _buffer : null,
  _tls    : {},

  initialize:function(options) {
    this.setOptions(options);
    this.options.server_hostname  = options.server_hostname || options.server_hostaddr;
  },

  // Initialier a crypted TLS _socket
  _build_tls_socket : function(callback){
    var license     = this.options.license;
    if(license) {
      this._tls = {
        key   : license.private_key,
        cert  : license.client_certificate,
        ca    : license.ca
      };
    }

    if(!this._tls.key)
      throw new Error("Missing private key");
    if(!this._tls.cert)
      throw new Error("Missing certificate");

    // Setup TLS connection
    var lnk = merge({
      host : this.options.server_hostaddr,
      port : this.options.server_port,
      servername : this.options.server_hostname.toLowerCase(),
    }, this._tls);

    console.log("Connecting with TLS to %s:%s", lnk.host, lnk.port);

    // TLS _socket with options & callback
    return tls.connect(lnk, callback);
  },


  // Initialize a cleartext tcp _socket
  _build_net_socket : function(callback){

    var lnk = {
      host : this.options.server_hostaddr,
      port : this.options.server_port,
    };
    console.log("Connecting with cleartext to %s:%s", lnk.host, lnk.port);
    return net.connect(lnk, callback);
  },

  // Connect to the server
  connect : function(chain, ondisconnect, server_addr) {

    var self = this;

    console.log('sneding registration' , chain)

    this.options.server_hostaddr = server_addr || this.options.server_hostaddr ;
    // Secured or clear method ?
    var is_secured    = !!(this._tls.key && this._tls.cert);
    var socket_method = is_secured ? this._build_tls_socket : this._build_net_socket;

    this._buffer = new Buffer(0);
    this._socket = socket_method(chain);

    this._socket.once('error' , function(err) {
      self.log.warn("cant connect to server" ,JSON.stringify(err)) ;
      ondisconnect();
    });

    // Bind datas
    this._socket.on('data', this.receive);
    this._socket.once('end', function() {
      console.log('Client disconnected');
      ondisconnect();
    });
  },

  // Low level method to send JSON data
  write : function(json){
    try {
      this._socket.write(JSON.stringify(json));
      this._socket.write(String.fromCharCode(this.Delimiter));
    } catch (e) {
      console.log("can't write in the _socket" , e) ;
    }
  },

  // Received some data
  receive : function(chars) {
    var delimiter_pos;
    this._buffer = Buffer.concat([this._buffer, chars]);

    while((delimiter_pos = indexOf(this._buffer, this.Delimiter)) != -1) {
      var buff = this._buffer.slice(0, delimiter_pos), data;
      this._buffer = this._buffer.slice(delimiter_pos + 1);
      try {
        data = JSON.parse(buff.toString());
      } catch(e) {
        console.log("Parsing response failed: "+e);
      }
      this.emit('message' , data);
    }
  },

  disconnect:function(){
    if(this._socket != null)
      this._socket.destroy();
    this._socket = null;
  },

});
