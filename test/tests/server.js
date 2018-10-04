const WS = require('ws');
const Websocket = require('../../lib/websocket');

const SERVER_PAYLOAD = require('crypto').randomBytes(64).toString('base64');
const CLIENT_PAYLOAD = require('crypto').randomBytes(64).toString('base64');

let s = require('http').createServer();

const server = new Websocket.Server(
{
  server: { port: 8080 }
});

//s.listen( 8080 );

server.on( 'client', client =>
{
	console.log('client');

	client.on( 'message', message =>
	{
		console.log( 'Server RX', message, CLIENT_PAYLOAD === message );
	});

	setInterval(() => { console.log( 'Server TX', SERVER_PAYLOAD ); client.send( SERVER_PAYLOAD ); }, 2000 );
});

const client = new WS( 'ws://localhost:8080', { perMessageDeflate: false } );

client.on('open', () =>
{
	client.on( 'message', message =>
	{
		console.log( 'Client RX', message, SERVER_PAYLOAD === message );
	});

	setInterval(() => { console.log( 'Client TX', CLIENT_PAYLOAD ); client.send( CLIENT_PAYLOAD ); }, 2000 );
});
