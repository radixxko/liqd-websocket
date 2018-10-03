'use strict';

module.exports = class WebsocketFrame
{
	static write( tx_buffer, message, options )
	{
		let flag = 0x80 | 0x01, length = message.length; //compress && (frameBuffer[0] |= 0x40);

		tx_buffer.push
		(
			( length < 126 )	? Buffer.from([ flag, length ]) :
			( length < 65536 )	? Buffer.from([ flag, 126, (length >> 8) & 255, (length) & 255 ])
								: Buffer.from([ flag, 127, 0, 0, 0, 0, (length >> 24) & 255, (length >> 16) & 255, (length >> 8) & 255, (length) & 255 ])
		);

		if( options.mask )
		{
			if( !( message instanceof Buffer ))
			{
				message = Buffer.from( message );
			}

			// TODO mask
		}

		tx_buffer.push( message );
	}

	static read( rx_buffer )
	{
		if( rx_buffer.length )
		{
			let header_length = 1, length, rx_block = 0, rx_length, frame;

			if( rx_buffer[0][1] < 126 )
			{
				length = rx_buffer[0][1];
				header_length += 1;
			}
			else if( length < 65536 )
			{
				length = (rx_buffer[0][2] << 8) + rx_buffer[0][3];
				header_length += 3;
			}
			else
			{
				length = (rx_buffer[0][6] << 24) + (rx_buffer[0][7] << 16) + (rx_buffer[0][8] << 8) + rx_buffer[0][9];
				header_length += 9;
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
				frame = frame.length === 1 ? frame[0] : Buffer.concat( frame );

				return frame.slice( header_length ).toString('utf8');
			}
		}
	}
}
