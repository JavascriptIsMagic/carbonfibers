'use strict';
const Monk = require('monk'),
	CarbonFiber = require('./carbon.fibers');
module.exports = Monk;
Monk.Promise.prototype.wait = function () {
	return new CarbonFiber(this, this.on, ['complete']).wait();
}
Monk.ObjectID = Monk.prototype.id().__proto__.constructor;