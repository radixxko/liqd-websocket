'use strict';

const EventEmitter = require('events');
const WebsocketFrame = require('./websocket_frame');

const randomKey = () => require('crypto').randomBytes(16).toString('base64');
const computeKey = ( key ) => require('crypto').createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11','binary').digest('base64');

module.exports = class WebsocketClient extends EventEmitter
{
	constructor( socket, options = {} )
	{
		super();

		this._socket = null;
		this._options = options;
		this._rx_buffer = [];
		this._tx_buffer = [];

		if( typeof socket === 'string' )
		{
			let key = randomKey();

			const connect = require('http').get(
			{
				host	: 'localhost',
				port	: 8080,
				path	: '/',
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
			});

			connect.on( 'upgrade', ( response, socket ) =>
			{
				if( computeKey( key ) === response.headers['sec-websocket-accept'] )
				{
					this._initialize( socket );

					this.emit( 'open' );
				}
			});
		}
		else
		{
			this._initialize( socket );

			this.emit( 'open' );
		}
	}

	_initialize( socket )
	{
		this._socket = socket;

		socket.setTimeout(0);
		socket.setNoDelay();

		socket.on( 'data', data =>
		{
			this._rx_buffer.push( data );

			while( data = WebsocketFrame.read( this._rx_buffer ))
			{
				this.emit( 'message', data );
			}
		});

		socket.on( 'error', error =>
		{
			this.emit( 'error', error );
		});
	}

	send( data )
	{
		try
		{
			WebsocketFrame.write( this._tx_buffer, data, this._options );

			while( data = this._tx_buffer.shift() )
			{
				this._socket.write( data );
			}
		}
		catch(e){ this.emit( 'error', e ); }
	}

	close( code, reason )
	{
		try
		{
			this.emit( 'close', code, reason );

			this._socket.shutdown();
		}
		catch(e){}

		this.removeAllListeners();
	}
}
