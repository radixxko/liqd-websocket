'use strict';

const Options = require('liqd-options');
const EventEmitter = require('events');
const WebsocketClient = require('./websocket_client');
const Server = require('net').Server;
const Crypto = require('crypto');

const computeKey = ( key ) => Crypto.createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11','binary').digest('base64');

module.exports = class WebsocketServer extends EventEmitter
{
	constructor( options )
	{
		super();

		this._options = Options( options,
		{
			server	: { _required: false, _passes: $ => $ instanceof Server },
			tls		: { _required: false, _type: 'object' },
			port	: { _required: false, _convert: parseInt },
			frame	:
			{
				_expand	: true,

				mask	: { _type: 'boolean', _default: false },
				limit	: { _type: 'number', _default: 100 * 1024 * 1024, _convert: $ => Math.min( $, 100 * 1024 * 1024 )},
				compression	:
				{
					_default: false, _expand: true,

					treshold: { _type: 'number', _default: 1024 }
				}
			},
			client	:
			{
				_expand	: true,

				accept	: { _type: 'function' }
			}
		});

		//console.log( this._options ); process.exit();

		this._clients = new Set();
		this._server = this._options.server ? this._options.server : require( this._options.tls ? 'https' : 'http' ).createServer( this._options.tls || undefined );

		this._server.on( 'upgrade', async( request, socket ) =>
		{
			if( request.headers['upgrade'] === 'websocket' && request.headers['sec-websocket-key'] )
			{
				if( !this._options.client.accept || await this._options.client.accept( request, socket ))
				{
					let client = new WebsocketClient( socket, { frame: this._options.frame });
					this._clients.add( client );

					socket.write
					(
						'HTTP/1.1 101 Switching Protocols\r\n' +
						'Upgrade: websocket\r\n' +
						'Connection: Upgrade\r\n' +
						'Sec-WebSocket-Accept: ' + computeKey( request.headers['sec-websocket-key'] ) + '\r\n' +
						'\r\n'
					);

					client.on( 'close', () => this._clients.delete( client ));
					client.on( 'error', () => {});

					this.emit( 'client', client, request );
				}
				else
				{
					socket.end( 'HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n' );
				}
			}
		});

		if( this._options.port )
		{
			this._server.listen( this._options.port );
		}
	}

	get server()
	{
		return this._server;
	}

	get clients()
	{
		return this._clients;
	}
}
