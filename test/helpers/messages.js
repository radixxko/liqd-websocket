'use strict';

const Crypto = require('crypto');
const Random = ( min, max ) => min + Math.floor( Math.random() * ( max - min + 0.999999999999999999 ));
const Message = () =>
{
    let message;

    switch( Random( 0, 13 ))
    {
        case  0: message = Crypto.randomBytes( 0 ); break;
        case  1: message = Crypto.randomBytes( 1 ); break;
        case  2: message = Crypto.randomBytes( Random( 2, 124 )); break;
        case  3: message = Crypto.randomBytes( 125 ); break;
        case  4: message = Crypto.randomBytes( 126 ); break;
        case  5: message = Crypto.randomBytes( 127 ); break;
        case  6: message = Crypto.randomBytes( 128 ); break;
        case  7: message = Crypto.randomBytes( Random( 129, 65534 )); break;
        case  8: message = Crypto.randomBytes( 65535 ); break;
        case  9: message = Crypto.randomBytes( 65536 );
        case 10: message = Crypto.randomBytes( Random( 65537, 131071 )); break;
        case 11: message = Crypto.randomBytes( 131072 ); break;
        case 12: message = 'Příliš žluťoučký kůň úpěl ďábelské ódy'; break;
        case 13: message = '👐 🙌 👏 🤝 👍 👎 👊 ✊ 🤛 🤜 🤞 ✌️ 🤟 🤘 👌 👈 👉 👆 👇 ☝️ ✋ 🤚 🖐 🖖 👋 🤙 💪 🦵 🦶 🖕 ✍️ 🙏'; break;
    }

    if( Math.random() < 0.5 && message.length && typeof message !== 'string' )
    {
        message = message.toString('base64');
    }

    return message;
}

module.exports = class Messages
{
    constructor()
    {
        this._cache = new Set();
        this._send = 0;
        this._received = 0;
        this._process = null;

        this._resolve = null;
        this._reject = null;

        this.process();
    }

    get count()
    {
        return this._send;
    }

    send()
    {
        let raw_message = Message();

        if( Math.random() < 0.5 && raw_message.length && typeof raw_message !== 'string' )
		{
			raw_message = raw_message.toString('base64');
		}

        let message = raw_message;

        if( message.length === 0 ){ message = ''; }
        else if( typeof message !== 'string' ){ message = message.toString('base64'); }

        this._cache.add( message );
        ++this._send;

        this.process();

        return raw_message;
    }

    receive( message )
    {
        if( message.length === 0 ){ message = ''; }
        else if( typeof message !== 'string' ){ message = message.toString('base64'); }

        this._cache.delete( message );
        ++this._received;

        this.process();
    }

    process()
    {
        if( this._process ){ clearTimeout( this._process ); }

        this._process = setTimeout(() =>
        {
            ( this._cache.size === 0 && this._send === this._received )
            ? this._resolve({ cache: this._cache.size, send: this._send, received: this._received })
            : this._reject({ cache: this._cache.size, send: this._send, received: this._received });
        },
        3000 );
    }

    finished()
    {
        return new Promise(( resolve, reject ) =>
        {
            this._resolve = resolve;
            this._reject = reject;
        });
    }
}
