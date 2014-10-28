const slice = Array.prototype.slice,
	fiber = require('./carbon.fibers'),
	less = require('less'),
	CarbonLess = module.exports;
CarbonLess.__proto__ = less;
CarbonLess.Parser = Parser
Parser.__proto__ = less.Parser;
function Parser(options) {
	if (!(this instanceof Parser)) {
		return new Parser(options);
	}
	this.__proto__ = less.Parser.apply(this, arguments);
	const _parse = this.parse;
	this.parse = function () {
		return new fiber(this, _parse, arguments).run();
	}.bind(this);
	const _push = this.push;
	this.push = function () {
		return new fiber(this, _push, arguments).run();
	}.bind(this);
}