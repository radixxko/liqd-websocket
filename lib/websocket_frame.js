'use strict';

function mask_payload( mask, payload )
{
	for( let i = 0; i < payload.length; ++i )
	{
		payload[i] ^= mask[i%4];
	}
}

module.exports = class WebsocketFrame
{
	static write( tx_buffer, message, options )
	{
		let flag = 0x80 | ( typeof message === 'string' ? 0x01 : 0x02 ),
			length = message.length,
			mask = options.mask && require('crypto').randomBytes(4); //compress && (frameBuffer[0] |= 0x40);

		tx_buffer.push
		(
			( length < 126 )	? Buffer.from([ flag, ( mask ? 0x80 : 0 ) | length ]) :
			( length < 65536 )	? Buffer.from([ flag, ( mask ? 0x80 : 0 ) | 126, (length >> 8) & 255, (length) & 255 ])
								: Buffer.from([ flag, ( mask ? 0x80 : 0 ) | 127, 0, 0, 0, 0, (length >> 24) & 255, (length >> 16) & 255, (length >> 8) & 255, (length) & 255 ])
		);

		if( mask )
		{
			tx_buffer.push( mask );

			if( typeof message === 'string' )
			{
				message = Buffer.from( message, 'utf8' );
			}

			mask_payload( mask, message );
		}

		tx_buffer.push( message );
	}

	static read( rx_buffer, emit )
	{
		while( rx_buffer.length )
		{
			// TODO concat first buffer until length present in first buffer

			let head = rx_buffer[0][1], header_length, length, rx_block = 0, rx_length, frame;

			if(( head & 0x7f) < 126 )
			{
				length = head & 0x7f;
				header_length = 2 + ( head & 0x80 ? 4 : 0 );
			}
			else if(( head & 0x7f ) < 127 )
			{
				length = (rx_buffer[0][2] << 8) + rx_buffer[0][3];
				header_length = 4 + ( head & 0x80 ? 4 : 0 );
			}
			else
			{
				length = (rx_buffer[0][6] << 24) + (rx_buffer[0][7] << 16) + (rx_buffer[0][8] << 8) + rx_buffer[0][9];
				header_length = 10 + ( head & 0x80 ? 4 : 0 );
			}

			rx_length = rx_buffer[0].length - header_length;

			while( rx_length < length && ++rx_block < rx_buffer.length )
			{
				rx_length += rx_buffer[rx_block].length;
			}

			if( rx_length === length )
			{
				frame = rx_buffer.splice( 0, rx_block + 1 );
			}
			else if( rx_length > length )
			{
				frame = rx_buffer.splice( 0, rx_block );
				frame.push( rx_buffer[0].slice(0, rx_buffer[0].length - rx_length + length ));
				rx_buffer[0] = rx_buffer[0].slice( rx_buffer[0].length - rx_length + length );
			}

			if( frame )
			{
				// TODO continuation frame;
				frame = frame.length === 1 ? frame[0] : Buffer.concat( frame );

				let opcode = frame[0] & 0x0f, payload = frame.slice( header_length );

				if( frame[1] & 0x80 )
				{
					mask_payload( frame.slice( header_length - 4, header_length ), payload );
				}

				switch( opcode )
				{
					case 0x01: emit( 'message', payload.toString('utf8')); break;
					case 0x02: emit( 'message', payload ); break;
					case 0x09: emit( 'ping', payload ); break;
					case 0x0a: emit( 'pong', payload ); break;
				}
			}
			else{ break; }
		}
	}
}
