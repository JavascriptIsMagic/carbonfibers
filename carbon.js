'use strict';
const DEBUG = !!process.env.DEBUG_CARBONFIBERS,
	CarbonFiber = module.exports = require('./carbon.fibers');
CarbonFiber.fibers = CarbonFiber;
['fs', 'server', 'mongo', 'nedb', 'redis', 's3', 'sql', 'ejs', 'less', 'statics', 'mailer', 'misc', 'zlib'].forEach(function (module) {
	function loadModule() {
		CarbonFiber[module] = require('./carbon.' + module);
	}
	try {
		loadModule();
	} catch(error) {
		if (error && error.code !== 'MODULE_NOT_FOUND') {
			throw error;
		} else {
			if (DEBUG) {
				console.warn('(optional) CarbonFiber.' + module + ' module not loaded, dependancies required:', '' + error);
			}
			Object.defineProperty(CarbonFiber, module, { get: loadModule });
		}
	}
});