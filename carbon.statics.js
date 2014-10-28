'use strict';
const DEBUG = !!process.env.DEBUG,
	slice = Array.prototype.slice,
	
	zlib = require('zlib'),
	crypto = require('crypto'),
	
	ejs = require('ejs'),
	fibers = require('./carbon');

	


	
function Statics(maxAge) {
	if (!(this instanceof Statics)) {
		return new Statics();
	}
	this.headers = {
		'Cache-Control': (DEBUG ? 'no-cache' : 'max-age=' + (maxAge || 3600)),
		'Content-Encoding': 'gzip',
		'Content-Type': 'text/html',
	};
	
}


// Server.prototype.isModified = function (pathname, status, contentType, _headers, files, stat, req, res, finish) {
    // var mtime           = Date.parse(stat.mtime),
        // key             = pathname || files[0],
        // headers         = {},
        // clientETag      = req.headers['if-none-match'],
        // clientMTime     = Date.parse(req.headers['if-modified-since']);


    // // Copy default headers
    // for (var k in this.options.headers) {  headers[k] = this.options.headers[k] }
    // // Copy custom headers
    // for (var k in _headers) { headers[k] = _headers[k] }

    // headers['Etag']          = JSON.stringify([stat.ino, stat.size, mtime].join('-'));
    // headers['Date']          = new(Date)().toUTCString();
    // headers['Last-Modified'] = new(Date)(stat.mtime).toUTCString();
    // headers['Content-Type']   = contentType;
    // headers['Content-Length'] = stat.size;

    // for (var k in _headers) { headers[k] = _headers[k] }

    // // Conditional GET
    // // If the "If-Modified-Since" or "If-None-Match" headers
    // // match the conditions, send a 304 Not Modified.
    // if ((clientMTime  || clientETag) &&
        // (!clientETag  || clientETag === headers['Etag']) &&
        // (!clientMTime || clientMTime >= mtime)) {
        // // 304 response should not contain entity headers
        // ['Content-Encoding',
         // 'Content-Language',
         // 'Content-Length',
         // 'Content-Location',
         // 'Content-MD5',
         // 'Content-Range',
         // 'Content-Type',
         // 'Expires',
         // 'Last-Modified'].forEach(function(entityHeader) {
            // delete headers[entityHeader];
        // });
        // finish(304, headers);
    // } else {
        // res.writeHead(status, headers);

        // this.stream(pathname, files, new(buffer.Buffer)(stat.size), res, function (e, buffer) {
            // if (e) { return finish(500, {}) }
            // finish(status, headers);
        // });
    // }
// };

// Server.prototype.stream = function (pathname, files, buffer, res, callback) {
    // (function streamFile(files, offset) {
        // var file = files.shift();

        // if (file) {
            // file = file[0] === '/' ? file : path.join(pathname || '.', file);

            // // Stream the file to the client
            // fs.createReadStream(file, {
                // flags: 'r',
                // mode: 666
            // }).on('data', function (chunk) {
                // // Bounds check the incoming chunk and offset, as copying
                // // a buffer from an invalid offset will throw an error and crash
                // if (chunk.length && offset < buffer.length && offset >= 0) {
                    // chunk.copy(buffer, offset);
                    // offset += chunk.length;
                // }
            // }).on('close', function () {
                // streamFile(files, offset);
            // }).on('error', function (err) {
                // callback(err);
                // console.error(err);
            // }).pipe(res, { end: false });
        // } else {
            // res.end();
            // callback(null, buffer, offset);
        // }
    // })(files.slice(0), 0);
// };

// Server.prototype.finish = function (status, headers, req, res, promise, callback) {
    // var result = {
        // status:  status,
        // headers: headers,
        // message: http.STATUS_CODES[status]
    // };

    // headers['server'] = this.serverInfo;

    // if (!status || status >= 400) {
        // if (callback) {
            // callback(result);
        // } else {
            // if (promise.listeners('error').length > 0) {
                // promise.emit('error', result);
            // } else {
              // res.writeHead(status, headers);
              // res.end();
            // }
        // }
    // } else {
        // // Don't end the request here, if we're streaming;
        // // it's taken care of in `prototype.stream`.
        // if (status !== 200 || req.method !== 'GET') {
            // res.writeHead(status, headers);
            // res.end();
        // }
        // callback && callback(null, result);
        // promise.emit('success', result);
    // }
// };



Statics.Html = CarbonHtml;
CarbonHtml.prototype.__proto__ = process.EventEmitter.prototype;
function CarbonHtml(root, path, name) {
	if (!(this instanceof CarbonHtml)) {
		return new CarbonHtml(root, path, file);
	}
	process.EventEmitter.call(this);
	
	this.buffer = null;
	
	this.root = root;
	this.path = path || '/';
	this.name = name.replace(/\.ejs/, '');
	this.filename = root + path + name;
	
	this.loading = null;
	
	this.watch = fs.watchFile(this.filename, { interval: DEBUG ? 1007 : 30011 }, this.load);
	fs.stat(this.filename, this.load);
}

CarbonHtml.prototype.load = function (current, previous) {
	if (!current || current.mtime !== previous.mtime) {
		if (this.loading) {
			this.loading.fiber.error = true;
		}
		this.loading = new CarbonFiber(this, this.update, []).fork();
	}
}

CarbonHtml.prototype.waitForUpdated = function () {
	const promise = new CarbonFiber();
	this.one('updated', promise.fulfill);
	return promise.wait();
}

CarbonHtml.prototype.update = function () {
	this.ejs().wait();
	this.loading = null;
	this.emit('updated', this);
}

CarbonHtml.prototype.ejs = function () {
	const promise = new CarbonFiber();
	
	return promise;
}

CarbonHtml.prototype.gzip = function (buffer) {
	return new CarbonFiber(zlib, zlib.gzip, [buffer]);
}

CarbonHtml.prototype.etag = function (buffer) {
	return ('"' + crypto.createHash('md5').update(buffer).digest('base64').substring(0, 22) + '"');
}