'use strict';
const slice = Array.prototype.slice,
	RedisClient = require('redis').RedisClient,
	fiber = require('./carbon.fibers'),
	net = require('net');
module.exports = CarbonRedis;

CarbonRedis.prototype = RedisClient.prototype;
function CarbonRedis(port, host, options) {
	if (!(this instanceof CarbonRedis)) {
		return new CarbonRedis(port | 0 || 6379, host, options);
	}
	RedisClient.call(this, net.createConnection(port, host), options);
	
	this.port = port;
	this.host = host;
	
	Object.keys(RedisClient.prototype).forEach(function (property) {
		const method = RedisClient.prototype[property];
		if (!/_|^(end|unref)$/.test(property)) {
			this[property] = function () {
				const args = slice.call(arguments);
				return new fiber(this, method, args).run();
			}.bind(this);
		}
	}.bind(this));
}
CarbonRedis.createClient = CarbonRedis;
