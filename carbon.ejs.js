const slice = Array.prototype.slice,
	fiber = require('./carbon.fibers'),
	ejs = require('ejs'),
	CarbonEjs = module.exports;
CarbonEjs.__proto__ = ejs
CarbonEjs.renderFile = function () {
	return new fiber(this, this.__proto__.renderFile, slice.call(arguments));
};