'use strict';

var http    = require('http');
var net     = require('net');

var assert  = require('power-assert');
var L       = require('./index');

describe('@nyarla/http-simulator', function () {
  context('#parseHTTPVersion', function () {
    it('should be succeed of pasing these format string', function () {
      assert.deepEqual( L.parseHTTPVersion('1.0'), [ 1, 0 ] );
      assert.deepEqual( L.parseHTTPVersion('1.1'), [ 1, 1 ] );
      assert.deepEqual( L.parseHTTPVersion('2.0'), [ 2, 0 ] );
    });

    it('should be failed of parsing these format string', function () {
      assert.throws(function () { L.parseHTTPVersion('1.1.1') });
      assert.throws(function () { L.parseHTTPVersion('A.1') });
      assert.throws(function () { L.parseHTTPVersion('1.B') });
    });

    it('should be succeed of parsing these format array', function () {
      assert.deepEqual( L.parseHTTPVersion([1,0]), [1,0] );
      assert.deepEqual( L.parseHTTPVersion([1,1]), [1,1] );
      assert.deepEqual( L.parseHTTPVersion([2,0]), [2,0] );
    });

    it('should be failed of parsing these format array', function () {
      assert.throws(function () { L.parseHTTPVersion([1,2,3]) });
      assert.throws(function () { L.parseHTTPVersion(['A', 1]) });
      assert.throws(function () { L.parseHTTPVersion([ 1, 'B' ]) });
    });

    it('should be succeed of parsing these format object', function () {
      assert.deepEqual( L.parseHTTPVersion({ major: 1, minor: 0 }), [ 1, 0 ] );
      assert.deepEqual( L.parseHTTPVersion({ major: 1, minor: 1 }), [ 1, 1 ] );
      assert.deepEqual( L.parseHTTPVersion({ major: 2, minor: 0 }), [ 2, 0 ] );
    });
    
    it('should be failed of parsing these format object', function () {
      assert.throws(function () { L.parseHTTPVersion({ major: 1 }) });
      assert.throws(function () { L.parseHTTPVersion({ minor: 1 }) });
      assert.throws(function () { L.parseHTTPVersion({  }) });
    });

    it('should uses default values', function () {
      assert.deepEqual(L.parseHTTPVersion(), [ 1, 0 ]);
    });

    it('should be failed these format numbers', function () {
      assert.throws(function () { L.parseHTTPVersion('0.1') });
      assert.throws(function () { L.parseHTTPVersion([ 0, 1 ]) });
      assert.throws(function () { L.parseHTTPVersion({ major: 0, minor: 1 }) });

      assert.throws(function () { L.parseHTTPVersion('-1.1') });
      assert.throws(function () { L.parseHTTPVersion([ -1, 1 ]) });
      assert.throws(function () { L.parseHTTPVersion({ major: -1, minor: 1 }) });

      assert.throws(function () { L.parseHTTPVersion('1.-1') });
      assert.throws(function () { L.parseHTTPVersion([ 1, -1 ]) });
      assert.throws(function () { L.parseHTTPVersion({ major: 1, minor: -1 }) });
    });
  });

  context('#buildHTTPURL', function () {
    it('should generates http URL', function () {
      assert.equal(
        L.buildHTTPURL('http://localhost/{id}', { id: 'nyarla' }, { action: 'search' }),
        'http://localhost/nyarla?action=search'
      );
    });
  });

  context('#createHTTPIncomingMessage', function () {
    it('should be creatable http.IncomingMessage', function () {
      var r = L.createHTTPIncomingMessage({
        httpVersion:  [ 1, 1 ],
        method:       'put',
        path:         'http://localhost/{id}',
        pathParams:   { id: 'nyarla' },
        queryParams:  { action: 'update' },
        headers:      [
          [ 'X-PoweredBy', 'foo' ],
          [ 'X-PoweredBy', 'bar' ],
          [ 'User-Agent',  'foo' ],
          [ 'User-Agent',  'bar' ],
          [ 'Set-Cookie',  'foo' ],
          [ 'Set-Cookie',  'bar' ]
        ]
      });

      assert.ok( r instanceof http.IncomingMessage );
      assert.ok( r.connection instanceof net.Socket );
      assert.ok( r.socket instanceof net.Socket ); 

      assert.equal( r.httpVersionMajor, 1 );
      assert.equal( r.httpVersionMinor, 1 );
      assert.equal( r.httpVersion, "1.1" );

      assert.equal( r.method, 'PUT' );
      assert.equal( r.url, 'http://localhost/nyarla?action=update' );

      assert.deepEqual(
        r.headers,
        {
          'x-poweredby': 'foo, bar',
          'user-agent':  'foo',
          'set-cookie':  [ 'foo', 'bar' ]
        }
      );
    }); 
  });

  context('#createHTTPServerResponse', function () {
    it('should be creatable http.ServerResponse', function (done) {
      var app = function (r, w) {
        w.statusCode = 200;
        w.setHeader('Content-Type', 'text/plain');
        w.end('hello, world!');
      };

      var fn = function (err, ret) {
        assert.deepEqual(ret, {
          statusCode: 200,
          statusMessage: "OK",
          headers: [
            [ 'Content-Type', 'text/plain' ]
          ],
          body: 'hello, world!'
        });

        done(err);
      };

      var r = L.createHTTPIncomingMessage({
        method: 'get',
        path:   'https://localhost/nyarla'
      });
      var w = L.createHTTPServerResponse(r, fn);

      app(r, w);
    });
  });

  context('#createSimulator', function () {
    it('should returns the simulated function of http access without http server', function (done) {
      var app = function (r, w) {
        w.statusCode = 200;
        w.setHeader('Content-Type', 'text/plain');
        w.end('hello, world!');
      };

      var req = {
        method: 'GET',
        url:    'http://localhost/nyarla',
      };

      var fn  = L.createSimulator(app);
      
      fn(req, function (err, ret) {
        assert.deepEqual(ret, {
          statusCode: 200,
          statusMessage: 'OK',
          headers: [
            [ 'Content-Type', 'text/plain' ]
          ],
          body: 'hello, world!'
        });

        done(err);
      })
    });
  });
});
