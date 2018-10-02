'use strict';

const EventEmitter = require('events');
const WebsocketFrame = require('./frame');

module.exports = class WebsocketClient extends EventEmitter
{
	constructor( url, options )
	{
		super();

		console.log('KOK');

		this._options = options;

		if( typeof url === 'string' )
		{
			console.log('From url');
			let key = require('crypto').randomBytes(16).toString('base64');

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
				if( require('crypto').createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11', 'binary').digest('base64') === response.headers['sec-websocket-accept'] )
				{
					this._initialize( socket );

					this.emit( 'open' );
				}
			});
		}
		else
		{
			console.log('From socket');
			this._initialize( url );

			this.emit( 'open' );
		}
	}

	_initialize( socket )
	{
		console.log('Initialize');

		this._socket = socket;
		this._rx_buffer = [];
		this._tx_buffer = [];

		socket.setTimeout(0);
		socket.setNoDelay();

		socket.on( 'data', data => { console.log(data); this._rx_buffer.push( data ) && this._dispatch() });
		socket.on( 'error', error =>
		{

		});
	}

	_dispatch()
	{
		console.log('dispatch');
		let message;

		while( message = WebsocketFrame.parse( this._rx_buffer ))
		{
			console.log( 'Received', message );
		}
	}

	send( data )
	{
		WebsocketFrame.create( this._tx_buffer, 0, data, 0x01 );
		let socket = this._socket, buffer = this._tx_buffer;

		function send_chunk()
		{
			let chunk = buffer.shift();

			if( chunk )
			{
				socket.write( chunk );

				setTimeout( send_chunk, 10 );
			}
		}

		send_chunk();
	}
}
