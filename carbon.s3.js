'use strict';
const slice = Array.prototype.slice,
	S3 = require('aws-sdk').S3,
	fibers = require('./carbon.fibers');
module.exports = CarbonS3;
function CarbonS3(options) {
	if (!(this instanceof CarbonS3)) {
		return new CarbonS3(options);
	}
	this.__proto__ = new S3(options);
	Object.keys(this.__proto__.__proto__).forEach(function (property) {
		const method = this[property];
		if (method instanceof Function) {
			this[property] = function () {
				const args = slice.call(arguments),
					promise = new fibers;
				let done;
				if (args[args.length-1] instanceof Function) {
					promise.on('done', args.pop());
				}
				function callback(error, response) {
					const args = slice.call(arguments);
					if (this.nextPage) {
						response.nextPage = function () {
							return new fibers(this, this.nextPage);
						}.bind(this);
					}
					promise.fulfill.apply(this, args);
				}
				args.push(callback);
				method.apply(this.__proto__, args);
				return promise;
			}.bind(this);
		}
	}, this);
}