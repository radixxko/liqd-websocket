'use strict';

const EventEmitter = require('events');
const WebsocketClient = require('./websocket_client');

const computeKey = ( key ) => require('crypto').createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11','binary').digest('base64');

module.exports = class WebsocketServer extends EventEmitter
{
	constructor( port )
	{
		super();

		this._server = require('http').createServer();
		this._clients = new Set();

		this._server.on( 'upgrade', ( request, socket ) =>
		{
			if( request.headers['upgrade'] === 'websocket' && request.headers['sec-websocket-key'] )
			{
				let client = new WebsocketClient( socket );
				this._clients.add( client );

				socket.write
				(
					'HTTP/1.1 101 Switching Protocols\r\n' +
					'Upgrade: websocket\r\n' +
					'Connection: Upgrade\r\n' +
					'Sec-WebSocket-Accept: ' + computeKey( request.headers['sec-websocket-key'] ) + '\r\n' +
					'\r\n'
				);

				client.on( 'error', error => this._clients.delete( client ));

				this.emit( 'connection', client, request );
			}
		});

		this._server.listen( port );
	}

	broadcast( data )
	{
		for( let client of this._clients )
		{
			client.send( data );
		}
	}
}


/*

var response = 'HTTP/1.1 ' + status + ' ' + httpStatusDescriptions[status] + '\r\n' +
                   'Connection: close\r\n';
    if (reason) {
        reason = reason.replace(headerSanitizeRegExp, '');
        response += 'X-WebSocket-Reject-Reason: ' + reason + '\r\n';
    }

*/
