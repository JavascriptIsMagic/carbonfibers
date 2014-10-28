'use strict';
const slice = Array.prototype.slice,
	zlib = require('zlib'),
	CarbonFiber = require('./carbon.fibers'),
	child = require('child_process'),
	CarbonZLib = module.exports = {};
CarbonZLib.__proto__ = zlib;
Object.keys(zlib).forEach(function (property) {
	const method = zlib[property];
	if (!/^([A-Z_]|create|reset)/.test(property) && zlib[property] instanceof Function) {
		CarbonZLib[property] = function () {
			const args = slice.call(arguments);
			return(new CarbonFiber(zlib, method, args));
		};
	}
});