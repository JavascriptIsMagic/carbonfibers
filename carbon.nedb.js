'use strict';
const fibers = require('./carbon.fibers'),
	nedb = require('nedb'),
	slice = Array.prototype.slice;
function Datastore(options) {
	if (!(this instanceof Datastore)) { return new Datastore(options); }
	nedb.apply(this, arguments);
}
module.exports = Datastore;
Datastore.__proto__ = nedb;
Datastore.prototype = Object.create(nedb.prototype);
['loadDatabase', 'ensureIndex', 'removeIndex', 'insert', 'count', 'find', 'findOne', 'update', 'remove'].forEach(function (name) {
	const method = nedb.prototype[name];
	Datastore.prototype[name] = function () {
		return new fibers(this, method, slice.call(arguments));
	};
}.bind(this));