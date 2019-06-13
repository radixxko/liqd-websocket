const assert = require('assert');
const Websocket = require('../../lib/websocket');
const Messages = require('../helpers/messages');
const WS = require('ws');

const SLEEP = ( ms ) => new Promise( resolve  => setTimeout( resolve, ms ));

it('should ping [client]', async function()
{
    const server = new WS.Server(
    {
        port: 8081
    });

    server.on( 'connection', client =>
    {
        setInterval(() => client.ping('ping_data'), 1000 );

    	client.on( 'message', message =>
    	{
            ClientMessages.receive( message );
    	});
    });

    const client = new Websocket.Client( 'ws://localhost:8081' );

    client.on( 'open', () =>
    {

    });

    client.on( 'error', console.error );

    await SLEEP( 55000 );

}).timeout( 60000 );
