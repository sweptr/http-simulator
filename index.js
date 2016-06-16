'use strict';

var http    = require('http'),
    net     = require('net'),
    qs      = require('querystring'),
    Buffer  = require('buffer').Buffer,
    URI     = require('uri-template-lite').URI
;

exports.parseHTTPVersion = function parseHTTPVersion(data) {
  var major, minor;

  if ( typeof(data) === 'string' ) {
    var src = data.split('.');
    
    if ( src.length !== 2 ) {
      throw new Error('invalid http version string: data => ' + data);
    }

    major = parseInt(src[0]);
    if ( typeof(major) !== 'number' || major !== major ) {
      throw new Error('invalid http version string: failed to parse major number: data => ' + data);
    }

    minor = parseInt(src[1]);
    if ( typeof(minor) !== 'number' || minor !== minor) {
      throw new Error('invalid http version string: failed to parse minor number: data => ' + data);
    }
  }
  else if ( data instanceof Array ) {
    if ( data.length !== 2 ) {
      throw new Error('invalid http version array: the format of this array should be [number, number]');
    }

    major = data[0];
    minor = data[1];
  }
  else if ( data instanceof Object ) {
    if ( ! 'major' in data ) {
      throw new Error('invalid http version Object: this Object should be included `major` property as number.');
    }

    if ( ! 'minor' in data ) {
      throw new Error('invalid http version Object: this Object should be included `minor` property as number.');
    }

    major = data.major;
    minor = data.minor;
  }
  else {
    major = 1;
    minor = 0;
  }

  if ( typeof(major) !== 'number' ) {
    throw new Error('invalid http verison number: major version of http is not number.');
  }

  if ( typeof(minor) !== 'number' ) {
    throw new Error('invalid http version number: minor version of http is not number.');
  }

  if ( major <= 0 ) {
    throw new Error('invalid http version number: major version should be larger than 0');
  }

  if ( minor < 0 ) {
    throw new Error('invalid http version number: minor version should not be smaller than 0');
  }

  return [ major, minor ]; 
}

exports.buildHTTPURL = function buildHTTPURL(base, params, queries) {
  var url   = URI.expand(base, params);
  var query = qs.stringify(queries);

  if ( query !== '' ) {
    url += '?' + query;
  }

  return url;
}

exports.createHTTPIncomingMessage = function createHTTPIncomingMessage(v) {
  var httpVersion = [ 1, 0 ];
  if ( 'httpVersion' in v ) {
    httpVersion = exports.parseHTTPVersion(v.httpVersion);
  }

  var method = 'GET';
  if ( 'method' in v ) {
    method = v.method.toUpperCase();
  }

  var path   = 'http://localhost/';
  if ( 'path' in v ) {
    path = v.path;
  }

  var pathParams = {};
  if ( 'pathParams' in v ) {
    pathParams = v.pathParams;
  }

  var queryParams = {};
  if ( 'queryParams' in v ) {
    queryParams = v.queryParams;
  }

  var headers = [];
  if ( 'headers' in v) {
    headers = v.headers;
  }

  var req = new http.IncomingMessage();
  
  req.httpVersionMajor = httpVersion[0];
  req.httpVersionMinor = httpVersion[1];
  req.httpVersion      = httpVersion[0].toString(10) + '.' + httpVersion[1].toString(10);

  req.method           = method;
  req.url              = exports.buildHTTPURL(path, pathParams, queryParams);

  for ( var idx = 0, len = headers.length; idx < len ; idx++ ) {
    var data = headers[idx];
    var raw  = data[0];
    var key  = raw.toLowerCase();
    var val  = data[1];

    switch ( key ) {
      case 'age':
      case 'authorization':
      case 'content-length':
      case 'content-type':
      case 'etag':
      case 'expires':
      case 'from':
      case 'host':
      case 'if-modified-since':
      case 'if-unmodified-since':
      case 'last-modified':
      case 'location':
      case 'max-forwards':
      case 'proxy-authorization':
      case 'referer':
      case 'retry-after':
      case 'user-agent':
        if ( typeof(req.headers[key]) === 'undefined' ) {
          req.headers[key] = val
          req.rawHeaders.push(raw);
          req.rawHeaders.push(val);
        }

        break;
      case 'set-cookie':
        if ( typeof(req.headers[key]) === 'undefined' ) {
          req.headers[key] = [ val ];
        }
        else {
          req.headers[key].push(val);
        }

        req.rawHeaders.push(raw);
        req.rawHeaders.push(val);
        
        break;
      default:
        if ( typeof(req.headers[key]) === 'undefined' ) {
          req.headers[key] = val;
        }
        else {
          req.headers[key] = [ req.headers[key], val ].join(', ');
        }

        req.rawHeaders.push(raw);
        req.rawHeaders.push(val);

        break;
    }
  }

  req.connection = req.socket = new net.Socket();

  return req;
}

exports.createHTTPServerResponse = function createHTTPServerResponse(req, done) {
  var res = new http.ServerResponse(req);
  
  res.end = function (data, encoding, callback) {
    if ( typeof(data) === 'function' ) {
      callback = data;
      encoding = null;
    }
    else if (  typeof(encoding) === 'function' ) {
      callback = encoding;
      encoding = null;
    }

    if ( data && typeof(data) !== 'string' && ! (data instanceof Buffer) ) {
      throw new TypeError('First argument must be a string or Buffer');
    }

    if ( this.finished ) { 
      return false;
    }


    if ( ! this._header ) {
      if (data) {
        this._contentLength = ( typeof(data) === 'string' )
                            ? Buffer.byteLength(data)
                            : data.length ;
      }
      else {
        this._contentLength = 0;
      }

      this._implicitHeader();
    }

    if ( data && ! this._hasBody ) {
      data = null;
    }

    var ret = {
      statusCode:     this.statusCode,
      statusMessage:  this.statusMessage,
      headers:        [],
      body:           ''
    }; 

    for ( var key in this._headers ) {
      if ( this._headers.hasOwnProperty(key) ) {
        ret.headers.push([ this._headerNames[key], this._headers[key] ]);
      }
    }

    if (data) {
      ret.body  = ( typeof(encoding) === 'string' )
                ? data.toString(encoding)
                : data.toString() ;
    }

    done(null, ret);

    return true;
  };

  return res;
};

exports.createSimulator = function createSimulator(app) {
  return function (v, done) {
    try {
      var r = exports.createHTTPIncomingMessage(v);
      var w = exports.createHTTPServerResponse(r, done);

      app(r, w);

      if ( typeof(v['body']) !== 'undefined' && r.method !== 'HEAD' && r.method !== 'GET' ) {
        r.emit('data', v.body);
      }

      r.emit('end');
    }
    catch (err) {
      done(err, null); 
    }
  }
};
