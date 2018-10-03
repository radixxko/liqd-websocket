const WS = require('ws');
const Websocket = require('../lib/websocket');

const PAYLOAD = require('crypto').randomBytes(129973).toString('base64');
//const PAYLOAD = require('crypto').randomBytes(64).toString('base64');

/*const wss = new WebSocket.Server(
{
  port: 8080
});

wss.on( 'connection', connection =>
{
	console.log('connection');

	connection.on( 'message', msg =>
	{
		console.log( 'Message: ' + msg );

		console.log( PAYLOAD === msg );
	});
});/**/

const server = new Websocket.Server( 8080 );

server.on( 'connection', ( connection, request ) =>
{
	console.log('connection' );

	//setInterval( () => connection.send('Hello client'), 1000 );

	connection.on( 'message', message =>
	{
		console.log( 'Server received', message );

		console.log( PAYLOAD === message );
	});
});

const client = new Websocket.Client( 'ws://localhost:8080' );

client.on('open', () =>
{
	console.log( PAYLOAD );

	client.on( 'message', message => console.log( 'Client received', message ));

	setInterval( () =>
	{
		client.send( PAYLOAD );
		client.send( PAYLOAD );
		//client.close();
	}
	, 2000 );
});
