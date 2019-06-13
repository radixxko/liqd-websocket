'use strict';

const MTU = 65536;

const Options = require('liqd-options');
const Multibuffer = require('liqd-multibuffer');
const EventEmitter = require('events');
const WebsocketFrame = require('./websocket_frame');
const Crypto = require('crypto');
const Status = Object.freeze({ CONNECTING: Symbol('CONNECTING'), OPEN: Symbol('OPEN'), CLOSING: Symbol('CLOSING'), CLOSED: Symbol('CLOSED') });
const SocketClose = Symbol('close'), SocketError = Symbol('error');

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

		this._status = Status.CONNECTING;
		this._socket = null;
		this._rx_buffer = new Multibuffer();
		this._tx_buffer = new Multibuffer();
		//this._tx_buffer._deflate = [];

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
					//'Sec-WebSocket-Origin'	: undefined
				}
			},
			this._options.tls ));

			connect.on( 'upgrade', ( response, socket ) =>
			{
				this._socket = socket;

				if( computeKey( key ) === response.headers['sec-websocket-accept'] )
				{
					this._initialize( socket );

					this.emit( 'open' );
				}
				else
				{
					this.close( SocketError, 'Invalid Websocket accept' );
				}
			});

			connect.on( 'response', response => this.close( SocketError, 'Invalid server reponse: ' + response.statusCode + ( response.statusMessage ? ' ' + response.statusMessage : '' )));
			connect.on( 'error', error => this.close( SocketError, error ));
		}
		else
		{
			this._initialize( socket );
		}
	}

	_initialize( socket )
	{
		this._status = Status.CONNECTING;
		this._socket = socket;

		socket.setTimeout(0);
		socket.setNoDelay();

		let emit = this.emit.bind( this );

		// TODO masking
		this.on( 'ping', payload => this.send( payload, { opcode: 0x0a }));
		this.on( 'pong', payload => {  });
		this.on( 'closing', ( code, reason ) => this.close( code, reason ));

		socket.on( 'data', data =>
		{
			this._rx_buffer.append( data );

			WebsocketFrame.read( this._rx_buffer, emit );
		});

		socket.on( 'end', () => this.close( SocketClose ));
		socket.on( 'close', () => this.close( SocketClose ));
		socket.on( 'error', error => this.close( SocketError, error ));
	}

	send( data, options = {})
	{
		try
		{
			if( this._status !== Status.CLOSED && ( this._status !== Status.CLOSING || options.opcode === 0x08 ))
			{
				WebsocketFrame.write( this._tx_buffer, data, Object.assign( options, this._options.frame ));

				while( this._tx_buffer.length )
				{
					// TODO cork socket instead of concat
					this._socket.write( this._tx_buffer.spliceConcat( 0, MTU ));
				}
			}

			if( this._status === Status.CLOSING )
			{
				this._destroy();
			}
		}
		catch( err ){ this.close( SocketError, err ); }
	}

	_destroy()
	{
		this._status = Status.CLOSED;

		if( this._socket )
		{
			this._socket.end();
			this._socket.destroy();
			this._socket.removeAllListeners();
			this._socket = null;
		}

		this._rx_buffer.clear();
		this._tx_buffer.clear();

		this.removeAllListeners();
	}

	close( code, reason )
	{
		if( this._status !== Status.CLOSING && this._status !== Status.CLOSED )
		{
			if( code === SocketError || code === SocketClose )
			{
				this._status = Status.CLOSED;

				this.emit( 'close' );

				( code === SocketError ) && this.emit( 'error', reason );

				this._destroy();
			}
			else
			{
				this._status = Status.CLOSING;

				this.emit( 'close', code, reason );

				let data = Buffer.alloc( code !== undefined ? 2 : 0 );

				if( code !== undefined || reason )
				{
					data.writeUInt16BE( parseInt( code || 1005 ));
					if( reason ){ data = Buffer.concat([ data, Buffer.from( reason, 'utf8' )]); }
				}

				// TODO zahodit vsetky nezacate spravy, ak niesom server tak cakat na closing frame az tak destroy
				this.send( data, { opcode: 0x08 });
			}
		}
	}

	get socket()
	{
		return this._socket;
	}

	get status()
	{
		return this._status;
	}

	get Status()
	{
		return Status;
	}
}
