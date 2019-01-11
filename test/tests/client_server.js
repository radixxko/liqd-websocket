const assert = require('assert');
const Websocket = require('../../lib/websocket');
const Messages = require('../helpers/messages');

it('should send and receive messages [client-server]', async function()
{
    const MSG_COUNT = 1000, ServerMessages = new Messages(), ClientMessages = new Messages();

    const server = new Websocket.Server(
    {
        port: 8080
    });

    server.on( 'client', client =>
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

    const client = new Websocket.Client( 'ws://localhost:8080' );

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
