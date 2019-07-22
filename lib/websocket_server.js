'use strict';

const Options = require('liqd-options');
const Timer = require('liqd-timer');
const EventEmitter = require('events');
const WebsocketClient = require('./websocket_client');
const Querystring = require('liqd-querystring');
const Server = require('net').Server;
const Crypto = require('crypto');

const computeKey = ( key ) => Crypto.createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11','binary').digest('base64');

function Ping( data )
{
	let now = Date.now();

	if( data.last_ping_sent && data.last_ping_sent + data.ping.timeout > now - data.client.last_data_received - 75 )
	{
		data.timer.set( data.client, Ping, data.ping.interval, data );
		data.ping.timeout && data.ping.on_timeout( data.client );
	}

	if( data.client.status === WebsocketClient.Status.OPEN )
	{
		if( data.client.last_data_received < now - data.ping.interval + 75 )
		{
			data.last_ping_sent = now;
			data.client.send( 'ping', { opcode: 0x09 });
			data.timer.set( data.client, Ping, data.ping.timeout || data.ping.interval, data );
		}
		else
		{
			data.timer.set( data.client, Ping, Math.max( 0, data.ping.interval - ( now - data.client.last_data_received )), data );
		}
	}
}

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

				accept	: { _type: 'function' },
				ping:
				{
					_expand	: true,

					interval	: { _type: 'number', _default: 20000 },
					timeout		: { _type: 'number', _default: 0 },
					on_timeout	: { _type: 'function', _default: client => client.close() }
				}
			}
		});

		this._clients = new Set();
		this._ping_pong_timer = new Timer();
		this._server = this._options.server ? this._options.server : require( this._options.tls ? 'https' : 'http' ).createServer( this._options.tls || undefined );

		this._server.on( 'upgrade', async( request, socket ) =>
		{
			if( request.headers['upgrade'] === 'websocket' && request.headers['sec-websocket-key'] )
			{
				request.query = Querystring.parse( ~request.url.indexOf('?') && request.url.substr( request.url.indexOf('?') + 1 ));
				request.cookies = Querystring.parseCookies( request.headers.cookie );

				if( !this._options.client.accept || await this._options.client.accept( request, socket ))
				{
					let client = new WebsocketClient( socket, { frame: this._options.frame });

					this._clients.add( client );

					if( this._options.client.ping.interval )
					{
						Ping({ client, timer: this._ping_pong_timer, ping: this._options.client.ping, last_ping_sent: 0 });
					}

					socket.write
					(
						'HTTP/1.1 101 Switching Protocols\r\n' +
						'Upgrade: websocket\r\n' +
						'Connection: Upgrade\r\n' +
						'Sec-WebSocket-Accept: ' + computeKey( request.headers['sec-websocket-key'] ) + '\r\n' +
						( request.headers['sec-websocket-protocol'] ? 'Sec-WebSocket-Protocol: ' + request.headers['sec-websocket-protocol'].trim().split(/ *, */)[0] + '\r\n' : '' ) +
						'\r\n'
					);

					client.on( 'close', () => { this._ping_pong_timer.clear( client ); this._clients.delete( client )});
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

	close( callback )
	{
		return this._server.close( callback );
	}
}
