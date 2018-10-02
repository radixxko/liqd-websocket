'use strict';

module.exports = class Websocket
{
	static get Server()
	{
		return require('./server');
	}

	static get Client()
	{
		return require('./client');
	}
}
