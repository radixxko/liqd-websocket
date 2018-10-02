'use strict';

const EventEmitter = require('events');
const WebsocketFrame = require('./frame');
const WebsocketClient = require('./client');

module.exports = class WebsocketServer
{
	constructor( port )
	{
		this._server = require('http').createServer();
		this._clients = new Set();

		this._server.on( 'upgrade', ( request, socket ) =>
		{
			console.log( 'Server Upgrade', request.headers );

			if( request.headers['upgrade'] === 'websocket' && request.headers['sec-websocket-key'] )
			{
				socket.setTimeout(0);
				socket.setNoDelay();

				socket.write
				(
					'HTTP/1.1 101 Switching Protocols\r\n' +
					'Upgrade: websocket\r\n' +
					'Connection: Upgrade\r\n' +
					'Sec-WebSocket-Accept: ' + WebsocketFrame.computeKey( request.headers['sec-websocket-key'] ) + '\r\n' +
					'\r\n'
				);

				let client = new WebsocketClient( socket );

				this._clients.add( client );
				client.on( 'error', error => this._clients.delete( client ));
			}
		});

		this._server.listen( port );
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
