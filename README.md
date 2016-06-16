@nyarla/http-simulator
======================

[![Build Status](https://travis-ci.org/nyarla/http-simulator.svg?branch=master)](https://travis-ci.org/nyarla/http-simulator)

  * A utility functions for simulate http access without http server with node.js  

SYNOPSIS
--------

```js
// load @nyarla/http-simulator
const L = require('@nyarla/http-simulator');

// this function is called from simulator function when end of http access simulation
const done  = function (err, data) {
  console.log(err);                 // error message (Error or null)
  console.log(data.statusCode);     // http status code (number)
  console.log(data.statusMessage);  // http status message (String)
  console.log(data.headers);        // Array of header-value pairs (Array< Array<K, V> >)
  console.log(data.body);           // response message (String or Buffer)
};

// web application handler on node.js
// req => require('http').IncomingMessage
// res => require('http').ServerResponse
const app   = function (req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('hello, world!');
};

// create simulator function
const fn    = L.createSimualtor(app);

// calling web application handler by http access simulator
fn(
  {
    // simulated http version
    // you can specified this value like as '1.0' or { major: 1, minor: 0 } 
    // default value is [ 1, 0 ]
    httpVersion:  [ 1, 0 ],

    // simuated http method.
    // this value is case-insensitive
    // default value is 'GET'
    method:       'put',

    // request path.
    // you can using URI template with pathParams in this value,
    // and URI template is processing by `uri-template-lite`
    // default value is 'http://localhost/'
    path:         'http://localhost/accounts/{id}',
    pathParams:   {
      id: 'nyarla'
    },

    // query paramters
    // this value is processing by `querystring` module by node.js
    // defualt value is {}
    queryParams: {
      action: 'put'
    },

    // http headers.
    // default value is []
    headers: [
      [ 'Content-Type', 'text/plain'      ],
      [ 'X-Powered-By', 'http-simulator'  ]
    ]
  },
  done
);
```

DEPENDENCES
-----------

  * `http`, `net`, `buffer` and `querystring` in node.js modules
  * [uri-template-lite](https://npmjs.com/packages/uri-template-lite)

AUTHOR
------

Naoki OKAMURA (Nyarla) <nyarla@thotep.net> <https://nyarla.net/> (this website is written by Japanese)

NOTES
-----

This module is overrides instnace method of `http.ServerResponse#end`,
and this function of using for overrides `http.ServerResponse#end` is
based on Javascript code of node.js's `http` core module.

LICENSE
-------

MIT

