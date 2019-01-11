const assert = require('assert');
const Websocket = require('../../lib/websocket');
const Messages = require('../helpers/messages');
const WS = require('ws');

it('should send and receive messages [client]', async function()
{
    const MSG_COUNT = 1000, ServerMessages = new Messages(), ClientMessages = new Messages();

    const server = new WS.Server(
    {
        port: 8081
    });

    server.on( 'connection', client =>
    {
    	let interval = setInterval(() =>
    	{
    		client.send( ServerMessages.send() );

    		if( ServerMessages.count >= MSG_COUNT ){ clearInterval( interval ); }
    	},
    	1 );

    	client.on( 'message', message =>
    	{
            ClientMessages.receive( message );
    	});
    });

    const client = new Websocket.Client( 'ws://localhost:8081' );

    client.on( 'open', () =>
    {
        let interval = setInterval(() =>
    	{
    		client.send( ClientMessages.send() );

    		if( ClientMessages.count >= MSG_COUNT ){ clearInterval( interval ); }
    	},
    	1 );

    	client.on( 'message', message =>
    	{
            ServerMessages.receive( message );
    	});
    });

    client.on( 'error', console.error );

    let [ server_status, client_status ] = await Promise.all([ ServerMessages.finished(), ClientMessages.finished() ]);

    client.close();
    server.close();

}).timeout( 60000 );
