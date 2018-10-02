const WebSocket = require('ws');
const WebsocketClient = require('../lib/client');
const WebsocketServer = require('../lib/server');

//const PAYLOAD = require('crypto').randomBytes(129973).toString('base64');
const PAYLOAD = require('crypto').randomBytes(64).toString('base64');

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
});*/

const server = new WebsocketServer( 8080 );

const client = new WebsocketClient( 'ws://localhost:8080' );

client.on('open', () =>
{
	console.log('OPENED');

	setInterval( () => client.send( PAYLOAD ), 2000 );
});
