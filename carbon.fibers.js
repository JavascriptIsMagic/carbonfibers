'use strict';
const DEBUG = !!process.env.DEBUG,
	slice = Array.prototype.slice,
	Fiber = require('fibers');

// Module:
module.exports = CarbonFiber;

CarbonFiber.Fiber = Fiber;

CarbonFiber.promise = function (/*CarbonFiber arguments*/) {
	return CarbonFiber.apply(null, arguments);
}

CarbonFiber.wait = function (carbonFiberArray/* or CarbonFiber arguments*/, sequentially) {
	if (Array.isArray(carbonFiberArray)) {
		const results = [];
		if (!sequentially) {
			let index = 0;
			while(index < carbonFiberArray.length) {
				if (carbonFiberArray[index].run instanceof Function) {
					carbonFiberArray[index].run();
				}
				index += 1;
			}
		}
		{
			let index = 0;
			while(index < carbonFiberArray.length) {
				if (carbonFiberArray[index].wait instanceof Function) {
					results.push(carbonFiberArray[index].wait());
				} else {
					results.push(CarbonFiber(carbonFiberArray[index]).wait());
				}
				index += 1;
			}
		}
		return results;
	}
	return CarbonFiber.apply(null, arguments).wait();
}

CarbonFiber.fork = function (/*CarbonFiber arguments*/) {
	return CarbonFiber.apply(null, arguments).fork();
}

// Class:
CarbonFiber.prototype.__proto__ = process.EventEmitter.prototype;
function CarbonFiber(/*optional*/object, method, /*optional*/args) {
	if (object instanceof CarbonFiber) { return object; }
	if (!(this instanceof CarbonFiber)) {
		const args = [],
			length = arguments.length;
		let index = 0,
			object = null,
			method;
		if (length) {
			if (arguments[index] instanceof Function) {
				method = arguments[index];
				index += 1;
			} else {
				object = arguments[index];
				method = object[arguments[index + 1]];
				index += 2;
			}
			while (index < length) {
				args.push(arguments[index]);
				index += 1;
			}
		}
		return new CarbonFiber(object, method, args);
	}
	process.EventEmitter.call(this);
	
	this.fulfill = this.fulfill.bind(this);
	this.run = this.run.bind(this);
	this.wait = this.wait.bind(this);
	
	this.running  = false;
	this.completed = false;
	
	this.results = null;
	this.error = null;
	this.waiters = [];
	this.fiber = null;
	
	this.returns = null;
	
	this.object = object || this;
	this.method = method;
	this.args = args || [];
	if (this.args[this.args.length - 1] instanceof Function) {
		this.on('done', this.args.pop()).run();
	}
}

CarbonFiber.prototype.fulfill = function (error) {
	if (this.completed) { return; }
	this.completed = true;
	this.running  = false;
	this.results = this.results || slice.call(arguments, 1);
	this.error = this.error || error;
	if (this.error) {
		if (this.listeners('error').length > 0) {
			this.emit('error', error);
		}
	} else {
		this.emit('success', this.results.length > 1 ? this.results : this.results[0]);
	}
	this.emit.apply(this, ['done', error].concat(this.results || []));
	if (this.waiters.length > 0) {
		let index = 0;
		while (index < this.waiters.length) {
			process.nextTick(this.waiters[index].run.bind(this.waiters[index]));
			index += 1;
		}
	}
}

CarbonFiber.prototype.wait = function () {
	const waiter = Fiber.current;
	if (!waiter) {
		throw new Error('.wait called outside a fiber');
	}
	if (this.error || waiter.error) { throw(this.error || waiter.error); }
	if (!this.completed) {
		if (!this.running) { process.nextTick(this.run); }
		const waiterIndex = this.waiters.length;
		this.waiters.push(waiter);
		Fiber.yield();
		this.waiters[waiterIndex] = null;
		if (this.error) { throw(this.error); }
	}
	if (this.results.length > 1) {
		return this.results;
	}
	return this.results[0];
}

CarbonFiber.prototype.run = function () {
	if (this.running || this.completed) { return; }
	this.running = true;
	if (this.method) {
		if (!this.fiber) {
			this.args.push(this.fulfill);
		}
		try {
			this.emit('run');
			const returned = this.method.apply(this.object, this.args);
			this.emit('returned', returned);
			if (this.fiber) {
				this.fulfill(null, returned);
			}
		} catch(error) {
			this.fulfill(error);
		}
	}
	// cleanup:
	this.fiber = null;
	
	this.object = null;
	this.method = null;
	this.args = null;
	
	return this;
}

CarbonFiber.prototype.fork = function () {
	this.fiber = new Fiber(this.run);
	process.nextTick(this.fiber.run.bind(this.fiber));
	return this;
}