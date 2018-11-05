const assert = require('assert');
const Crypto = require('crypto');
const Cache = require('liqd-cache');
const Websocket = require('../../lib/websocket');

const Messages = new Cache();
const Random = ( min, max ) => min + Math.floor( Math.random() * ( max - min ));
const Message = () => Crypto.randomBytes( Math.random() < 0.34 ? Random(1, 128) : Math.random() < 0.5 ? Random(128, 65536) : Random(65536, 128000) );

const server = new Websocket.Server(
{
  port: 8080
});

server.on( 'client', client =>
{
	console.log('Client');

	let sent_messages = 0, interval = setInterval(() =>
	{
		let message = Message();

		if( Math.random() < 0.5 )
		{
			message = message.toString('base64');
		}

		Messages.set( typeof message === 'string' ? message : message.toString('hex'), 'server->client not received', 5000, assert.fail );

		client.send( message );
        //console.log( sent_messages );

		if( ++sent_messages >= 10000 ){ clearInterval( interval ); console.log( 'Server sent ' + sent_messages + ' messages' ) }
	},
	1 );

	client.on( 'message', message =>
	{
        //console.log( 'client message' );

		Messages.delete( typeof message === 'string' ? message : message.toString('hex'), false );
	});
});

const client = new Websocket.Client( 'ws://localhost:8080' );

client.on( 'open', () =>
{
    let sent_messages = 0, interval = setInterval(() =>
	{
		let message = Message();

		if( Math.random() < 0.5 )
		{
			message = message.toString('base64');
		}

        Messages.set( typeof message === 'string' ? message : message.toString('hex'), 'client->server not received', 5000, assert.fail );

        client.send( message );
        //console.log( sent_messages );

        if( ++sent_messages >= 10000 ){ clearInterval( interval ); console.log( 'Client sent ' + sent_messages + ' messages' ) }
	},
	1 );

	client.on( 'message', message =>
	{
        //console.log( 'server message' );

		Messages.delete( typeof message === 'string' ? message : message.toString('hex'), false );
	});
});

client.on( 'error', console.error );
