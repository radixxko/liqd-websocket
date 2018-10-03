'use strict';

module.exports = class Websocket
{
	static get Server()
	{
		return require('./websocket_server');
	}

	static get Client()
	{
		return require('./websocket_client');
	}
}
