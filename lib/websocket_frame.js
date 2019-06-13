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
	static write( tx_buffer, payload , options = {})
	{
		let flag = 0x80 | ( options.opcode ? options.opcode : ( typeof payload === 'string' ? 0x01 : 0x02 ));

		payload = ( typeof payload === 'string' ? Buffer.from( payload, 'utf8' ) : payload );

		let	length = payload.length, mask = options.mask && require('crypto').randomBytes(4); //compress && (frameBuffer[0] |= 0x40);

		tx_buffer.append
		(
			( length < 126 )	? Buffer.from([ flag, ( mask ? 0x80 : 0 ) | length ]) :
			( length < 65536 )	? Buffer.from([ flag, ( mask ? 0x80 : 0 ) | 126, (length >> 8) & 255, (length) & 255 ])
								: Buffer.from([ flag, ( mask ? 0x80 : 0 ) | 127, 0, 0, 0, 0, (length >> 24) & 255, (length >> 16) & 255, (length >> 8) & 255, (length) & 255 ])
		);

		if( mask )
		{
			tx_buffer.append( mask );

			mask_payload( mask, payload );
		}

		tx_buffer.append( payload );
	}

	static read( rx_buffer, emit )
	{
		while( rx_buffer.length > 2 )
		{
			let opcode = rx_buffer.get(0) & 0x0f, head = rx_buffer.get(1), header_length, payload_length;

			if(( head & 0x7f) < 126 )
			{
				payload_length = head & 0x7f;
				header_length = 2 + ( head & 0x80 ? 4 : 0 );
			}
			else if(( head & 0x7f ) < 127 && rx_buffer.length > 4 )
			{
				payload_length = (rx_buffer.get(2) << 8) + rx_buffer.get(3);
				header_length = 4 + ( head & 0x80 ? 4 : 0 );
			}
			else if( rx_buffer.length > 10 )
			{
				payload_length = (rx_buffer.get(6) << 24) + (rx_buffer.get(7) << 16) + (rx_buffer.get(8) << 8) + rx_buffer.get(9);
				header_length = 10 + ( head & 0x80 ? 4 : 0 );
			}

			if( header_length && header_length + payload_length <= rx_buffer.length )
			{
				let header = rx_buffer.spliceConcat( 0, header_length ), payload = rx_buffer.spliceConcat( 0, payload_length )

				if( header[1] & 0x80 )
				{
					mask_payload( header.slice( header_length - 4 ), payload );
				}

				switch( opcode )
				{
					case 0x01: emit( 'message', payload.toString('utf8')); break;
					case 0x02: emit( 'message', payload ); break;
					case 0x08: emit( 'closing', payload.length >= 2 ? payload.readUInt16BE() : undefined, payload.length > 2 ? payload.slice(2).toString('utf8') : undefined ); break;
					case 0x09: emit( 'ping', payload ); break;
					case 0x0a: emit( 'pong', payload ); break;
				}
			}
			else{ break; }
		}
	}
}
