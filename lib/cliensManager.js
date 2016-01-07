var Class   = require('uclass');
var Options = require('uclass/options');
var clientFactory  = require('../server/clientFactory');

var util  = require('util');
var each    = require('mout/object/forOwn');
var merge   = require('mout/object/merge');
var cmdsDispatcher = require('./cmdsDispatcher')

var Server = module.exports = new Class({
    Implements : [ require("uclass/events"), Options, cmdsDispatcher],

    Binds : [
        'new_client',
        'get_client',
        'register_client',
        'lost_client',
    ],

    _clientsList : {},


    initialize:function() {

        var self = this;

        this.register_cmd("base" , "register" , function(client , query){
            client.registrationArgs   = query.args;
            client.registration_time  = Date.now();
            self.register_client(client);
            client.respond(query, "ok");
        })

        this._clientFactory = new clientFactory();
    },


    get_client : function(client_key){
        return this._clientsList[client_key];
    },

    new_client : function(type , options ,stream){
        var self = this;
        var client = this._clientFactory.getClient(type , options , stream);

        client.on('message', function(data){
            self._dispatch(client , data);
        });
        client.on('disconnect',function(){
            self.lost_client(client)
        })
    },

    // Register an active client, with id
    // Used by new_tcp_client
    register_client : function(client){
        if(!client.network_client)
            return; //leave the timeout to kill us

        // Check SSL client cert matches
        var exp = client.network_client.export_json();
        if(exp.secured && exp.name != client.client_key) {
            this.log.info("The cert (%s) does NOT match the given id %s", exp.name, client.client_key);
            //leaving the initialize timeout to kill us
            return;
        }

        // Avoid conflicts
        if(this._clientsList[client.client_key]){
            client.disconnect();
            return ;
        }

        // Save client
        this._clientsList[client.client_key] = client;

        // Propagate
        this.broadcast('base', 'registered_client', client.export_json());
    },

    lost_client : function(client){
        // Remove from list
        console.log("Lost client");
        delete this._clientsList[client.client_key];
        this.broadcast('base', 'unregistered_client', {client_key : client.client_key });
    },


    broadcast:function(ns, cmd, payload){
        console.log("BROADCASTING ", ns, cmd);
        each(this._clientsList, function(client){
            client.send(ns, cmd, payload);
        });

        this.emit(util.format("%s:%s", ns, cmd), payload);
    },

});
