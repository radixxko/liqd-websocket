function getWebSocketFrameMessageBytes(code, message)
{

	var index = code ? 2 : 0;
	var binary = message instanceof Int8Array || message instanceof Buffer;
	var length = message.length;

	var messageBuffer = Buffer.alloc(length + index);

	for (var i = 0; i < length; i++) {
		if (binary)
			messageBuffer[i + index] = message[i];
		else
			messageBuffer[i + index] = message.charCodeAt(i);
	}

	if (code) {
		messageBuffer[0] = code >> 8;
		messageBuffer[1] = code;
	}

	return messageBuffer;
}

const crypto = require('crypto');

module.exports = class WebsocketFrame
{
	static computeKey( key )
	{
		return crypto.createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11','binary').digest('base64');
	}

	static create( tx_buffer, code, message, type, compress = false )
	{
		var messageBuffer = getWebSocketFrameMessageBytes(code, message);
		let length = messageBuffer.length;

		var lengthBuffer = ( length <= 125 ) ? Buffer.from([ length ]) : (( length <= 65535 ) ? Buffer.from([ 126, (length >> 8) & 255, (length) & 255 ]) : Buffer.from([ 127, 0, 0, 0, 0, (length >> 24) & 255, (length >> 16) & 255, (length >> 8) & 255, (length) & 255 ]));
		var frameBuffer = Buffer.alloc(1 + lengthBuffer.length + messageBuffer.length);
		frameBuffer[0] = 0x80 | type;
		//compress && (frameBuffer[0] |= 0x40);
		lengthBuffer.copy(frameBuffer, 1, 0, lengthBuffer.length);
		messageBuffer.copy(frameBuffer, lengthBuffer.length + 1, 0, messageBuffer.length);

		let processed = 0;

		while( processed < frameBuffer.length )
		{
			tx_buffer.push( frameBuffer.slice( processed, processed + 4 ) );
			processed += 4;
		}
	}

	static parse( rx_buffer )
	{
		console.log( 'parse' );

		if( rx_buffer.length )
		{
			let length = rx_buffer[0][1], rx_body_length = rx_buffer[0].length - 2, block = 0;

			while( rx_body_length < length && ++block < rx_buffer.length )
			{
				rx_body_length += rx_buffer[block].length;
			}

			if( rx_body_length >= length )
			{
				let body = rx_buffer.splice( 0, block );

				console.log('MAM');
			}
			else
			{
				console.log('NEMAM');
			}


			//TODO mask
			//TODO rx_buffer.__frame_cache = dasda;


			console.log( length );
		}
	}
}
