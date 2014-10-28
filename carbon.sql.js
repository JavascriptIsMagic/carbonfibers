'use strict';
const slice = Array.prototype.slice,
	CarbonFiber = require('./carbon.fibers'),
	
	pg = require('pg'),
	mosql = require('mongo-sql');

let ObjectID; try { ObjectID = require('monk').id().constructor; } catch (e) {}

module.exports = CarbonSql;
CarbonSql.prototype.__proto__ = pg.prototype;
function CarbonSql(connectionString) {
	if (!(this instanceof CarbonSql)) {
		return new CarbonSql(connectionString);
	}
	this.connectionString = connectionString;
	this.pgsql = this.pgsql.bind(this);
	this.mosql = this.mosql.bind(this);
	console.log();
	this.moSanitize = this.moSanitize.bind(this);
}
CarbonSql.mosql = mosql;
CarbonSql.pg = pg;
CarbonSql.prototype.pgsql = function () {
	var args = slice.call(arguments),
		promise = new CarbonFiber();
	pg.connect(this.connectionString, function (e, client, done) {
		if (e) { return promise.fulfill(e); }
		function complete() {
			done();
			promise.fulfill.apply(null, arguments);
		}
		args.push(complete);
		client.query.apply(client, args);
	});
	return promise;
};
CarbonSql.prototype.moSanitize = function (query) {
	if(Array.isArray(query)) {
		return query.map(function (item) {
			return this.moSanitize(item);
		}, this);
	} else if (query && query.constructor === Object) {
		Object.keys(query).forEach(function (key) {
			query[key] = this.moSanitize(query[key]);
		}, this);
	} else if (ObjectID && query instanceof ObjectID) {
		return '' + query;
	}
	return query;
};
CarbonSql.prototype.mosql = function (query, mode) {
	var moQuery = mosql.sql(this.moSanitize(query)),
		moQueryQuery;
	if (mode === 'raw') { return moQuery; }
	moQueryQuery = moQuery.toQuery();
	if (mode === 'query') { return moQueryQuery; }
	return this.pgsql(moQueryQuery.text, moQueryQuery.values);
};