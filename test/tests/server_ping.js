const assert = require('assert');
const Websocket = require('../../lib/websocket');
const Messages = require('../helpers/messages');
const WS = require('ws');

const SLEEP = ( ms ) => new Promise( resolve  => setTimeout( resolve, ms ));

it('should ping [server]', async function()
{
    const server = new Websocket.Server(
    {
        port: 8082,
        client: { ping: { interval: 2000, timeout: 1000, on_timeout: c => c }}
    });

    server.on( 'client', client =>
    {
    	client.on( 'message', message =>
    	{
            ClientMessages.receive( message );
    	});
    });

    const client = new WS( 'ws://localhost:8082' );

    client.on( 'open', () =>
    {

    });

    client.on( 'error', console.error );

    await SLEEP( 55000 );

}).timeout( 60000 );
