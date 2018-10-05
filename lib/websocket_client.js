'use strict';

const Options = require('liqd-options');
const EventEmitter = require('events');
const WebsocketFrame = require('./websocket_frame');
const Crypto = require('crypto');

const randomKey = () => Crypto.randomBytes(16).toString('base64');
const computeKey = ( key ) => Crypto.createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11','binary').digest('base64');

module.exports = class WebsocketClient extends EventEmitter
{
	constructor( socket, options = {} )
	{
		super();

		this._options = Options( options,
		{
			tls 	: { _required: false, _type: 'object' },
			frame	:
			{
				_expand	: true,

				mask	: { _type: 'boolean', _default: true },
				limit	: { _type: 'number', _default: 100 * 1024 * 1024, _convert: $ => Math.min( $, 100 * 1024 * 1024 )},
				compression	:
				{
					_default: false, _expand: true,

					treshold: { _type: 'number', _default: 1024 }
				}
			}
		});

		this._socket = null;
		this._rx_buffer = [];
		this._tx_buffer = [];

		if( typeof socket === 'string' )
		{
			let [ , protocol, host, port, path ] = socket.match(/^(ws{1,2}):\/\/([^\/:]+):*([0-9]*)(.*)$/) || [];

			if( !( protocol && host ))
			{
				throw new Error( 'Invalid url: "' + socket + '", expecting "ws(s)://host[:port][/path]"' );
			}

			let key = randomKey();

			const connect = require( protocol === 'wss' ? 'https' : 'http' ).get( Object.assign(
			{
				host,
				port	: port || ( protocol === 'wss' ? 443 : 80 ),
				path	: path || '/',
				headers	:
				{
					'Connection' 				: 'Upgrade',
					'Upgrade' 					: 'websocket',
					'Sec-WebSocket-Version'		: '13',
					'Sec-WebSocket-Key' 		: key,
					'Sec-Websocket-Extensions'	: 'client_max_window_bits', // 'permessage-deflate,
					//'Sec-WebSocket-Protocol'	: undefined,
					//'Sec-WebSocket-Origin'		: undefined
				}
			},
			this._options.tls ));

			connect.on( 'upgrade', ( response, socket ) =>
			{
				if( computeKey( key ) === response.headers['sec-websocket-accept'] )
				{
					this._initialize( socket );

					this.emit( 'open' );
				}
				else
				{
					this.emit( 'error', 'Invalid Websocket accept' );

					this.close();
				}
			});

			connect.on( 'response', ( response ) =>
			{
				this.emit( 'error', 'Invalid server reponse: ' + response.statusCode + ( response.statusMessage ? ' ' + response.statusMessage : '' ));
			});

			connect.on( 'error', error =>
			{
				this.emit( 'error', error );

				this.removeAllListeners();
			});
		}
		else
		{
			this._initialize( socket );
		}
	}

	_initialize( socket )
	{
		this._socket = socket;

		socket.setTimeout(0);
		socket.setNoDelay();

		let emit = this.emit.bind( this );

		socket.on( 'data', data =>
		{
			this._rx_buffer.push( data );

			WebsocketFrame.read( this._rx_buffer, emit );
		});

		socket.on( 'end', () =>
		{
			this.emit( 'end' );
			socket.end();
		});

		socket.on( 'close', () => this.close() );

		socket.on( 'error', error =>
		{
			this.emit( 'error', error );
			socket.destroy();
		});
	}

	send( data )
	{
		try
		{
			WebsocketFrame.write( this._tx_buffer, data, this._options.frame );

			while( data = this._tx_buffer.shift() )
			{
				this._socket.write( data );
			}
		}
		catch(e){ this.emit( 'error', e ); }
	}

	close( code, reason )
	{
		this._socket.end();
		this._socket.destroy();

		this._rx_buffer = []
		this._tx_buffer = [];

		this.emit( 'close', code, reason );

		this.removeAllListeners();
	}

	get socket()
	{
		return this._socket;
	}
}
