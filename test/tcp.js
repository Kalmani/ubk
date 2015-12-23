"use strict";

var expect = require('expect.js')
var stripStart = require('nyks/string/stripStart');
var range   = require('mout/array/range');

var Server = require('../server');
var Client = require('../client/tcp');

var http   = require('http');

var port = 3000;
var server = new Server({server_port:port});

describe("Basic server/client chat", function(){

    it("must start the server", function(done){
        server.start_tcp_server(function(){
            done();
        });
    });


    it("should allow client to connect", function(done){
        var client = new Client({server_port:port});

        server.once('base:registered_client', function(device){
            expect(Object.keys(server._clientsList).length).to.be(1);
            device = server.get_client(device.client_key);
            device.disconnect();
            setTimeout(function(){
                expect(Object.keys(server._clientsList).length).to.be(0);
                done();
            }, 50)
        });
        client.connect();
    })


    it("should support a very simple rpc definition & call", function(done){

        var client = new Client({server_port:port , });

        //very simple RPC design
        client.register_rpc("math", "sum", function(a, b, chain){
            //heavy computational operation goes here
            chain(null, a + b);
        });


        server.on('base:registered_client', function(device){
            device = server.get_client(device.client_key);
            device.call_rpc("math", "sum", [2, 4], function(error, response){
                expect(error).not.to.be.ok();
                server.off('base:registered_client');
                expect(response).to.be(6);
                device.disconnect();
            });
        });
        client.connect(null , done);

    })


    it("should support multiple clients", function(done){
        var pfx = 'client_', clients = [];

        range(0,20).forEach( function(i){
            var client = new Client({server_port:port, client_key:pfx + i});

            client.register_rpc("math", "sum", function(a, b, chain){
                var r = a + b + i;
                console.log("doing math in client %s#%s is %s", client.client_key, i, r);
                chain(null, r);
            });
            clients.push(client);
        });

        var checks = {};

        server.on('base:registered_client', function(device){
            var i = Number(stripStart(device.client_key, pfx)),
                device = server.get_client(device.client_key);

            console.log("new device", device.client_key, i);

            device.call_rpc("math", "sum", [2, 4], function(error, response){
                expect(response).to.be(6 + i);
                checks[i] = true;
                device.disconnect();

                if(Object.keys(checks).length == clients.length){
                    server.off('base:registered_client');
                    done();}
            });
        });
        clients.forEach(function(client){ client.connect()});
    });

});
