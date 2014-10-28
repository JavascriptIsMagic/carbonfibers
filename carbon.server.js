'use strict';
const slice = Array.prototype.slice,
	zlib = require('zlib'),
	fiber = require('./carbon.fibers'),
	querystring = require('querystring'),
	http = require('http'),
	url = require('url');
module.exports = Server;
Server.prototype.__proto__ = http.Server.prototype;
function Server(httpRequestHandler, options) {
	if (!(this instanceof Server)) {
		return new Server(httpRequestHandler, options);
	}
	this.options = options || {};
	this.incommingMessage = this.incommingMessage.bind(this);
	this.httpRequestHandler = httpRequestHandler.bind(this);
	http.Server.call(this, this.incommingMessage);
}
Server.prototype.incommingMessage = function (request, response) {
	request.headers = request.headers || {};
	request.url = request.url.replace(/^[^\/]/, '/$&');
	request.location = url.parse(request.url);
	request.hostname = (request.headers.host || '').split(':')[0] || '';
	request.timestamp = Date.now();
	// Handle Cross-Origin Resource Sharing (coors) requests:
	if (this.options.coors) {
		const exposeHeaders = request.headers['access-control-request-headers'] || 'accept, origin, content-type, x-session';
		response.setHeader('Access-Control-Allow-Origin', request.headers.origin);
		response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
		response.setHeader('Access-Control-Expose-Headers',  exposeHeaders);
		response.setHeader('Access-Control-Allow-Headers', exposeHeaders);
		if (request.method === 'OPTIONS') {
			response.statusCode = 200;
			return response.end();
		}
	}
	request.server = this;
	request.response = response;
	request.fiber = new fiber(this, this.httpRequestHandler, [request, response]);
	request.fiber.fork();
};
Server.parseBody = function (request) {
	const buffer = [],
		promise = new fiber();
	request.on('data', function (chunk) {
		buffer.push(chunk);
	});
	request.on('end', function () {
		try {
			const body = JSON.parse(buffer.join(''));
			request.body = Array.isArray(body) ? body : body ? [body] : [];
			promise.fulfill(null, request.body);
		} catch (e) {
			promise.fulfill(null, []);
		}
	});
	return(promise);
};
Server.request = function (options) {
	const promise = new fiber();
	promise.request = http.request(options, function (response) {
		let data = '';
		promise.response = response;
		promise.emit('response', response);
		response.on('data', function (chunk) {
			data += chunk.toString();
		});
		response.on('end', function () {
			promise.fulfill(null, data);
		});
	}).on('error', function (error) {
		promise.fulfill(error);
	});
	if (options.data) {
		promise.request.write(options.data);
	}
	promise.request.end();
	return promise;
};
Server.get = function (host, path) {
	return Server.request({
		hostname: host,
		path: path,
		port: 80,
		method: 'GET',
	});
};
Server.post = function (host, path, data) {
	const post = querystring.stringify(data),
		promise = Server.request({
			hostname: host,
			path: path,
			port: 80,
			method: 'POST',
			data: post,
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': post.length
			}
		});
	return promise;
};