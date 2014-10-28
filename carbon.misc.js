'use strict';
const hasOwn = Object.prototype.hasOwnProperty,
	fs = require('./carbon.fs'),
	path = require('path'),
	fibers = require('./carbon.fibers');
//JSON:
function copyJSON(json) {
	return(JSON.parse(JSON.stringify(json)));
}
function mergeJSON(json, overrides, /*optional*/concatArrays) {
	if (Array.isArray(overrides)) {
		if (concatArrays && Array.isArray(json)) {
			return(copyJSON(json).concat(copyJSON(overrides)));
		}
	} else if (json && overrides && (json instanceof Object) && (overrides instanceof Object)) {
		let result = {};
		for (let key in json) {
			if (hasOwn.call(json, key) && !hasOwn.call(overrides, key)) {
				result[key] = json[key];
			}
		}
		for (let key in overrides) {
			if (hasOwn.call(overrides, key)) {
				result[key] = mergeJSON(json[key], overrides[key], concatArrays);
			}
		}
		return(result);
	}
	return(copyJSON(overrides));
}
function loadJSON(fullpath, displayWarnings, evil, callback) {
	fullpath = path.resolve(fullpath);
	fs.readFile(fullpath)
		.on('done', function (error, content) {
			if (!content) {
				error = new Error(' No Such JSON File.');
			}
			(error && displayWarnings && console.warn('\nERROR: Unable to load file: ', fullpath, '\n' + error.stack + '\n'));
			if (!error) {
				try {
					return(callback(null, JSON.parse(content)));
				} catch (error) {
					(displayWarnings && console.warn('WARNING: JSON' + error + ' ', fullpath));
					if (evil) {
						try {
							return(callback(null, eval('(' + ('' + (content||'')).trim() + ')')));
						} catch (error) {
							(displayWarnings && console.warn('\nERROR: Unable to load file: ', fullpath, '\n' + error.stack + '\n'));
						}
					}
				}
			}
			return(callback(null, null));
		})
		.run();
}
//RegExp:
function escapeRegExp(string) {
	return('' + (string || '')).replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}
//Format:
function formatSeconds(ms) {
	let sec = ('' + (ms * 0.001)).split('.');
	sec[1] = ((sec[1]||'')+'000').substring(0, 3);
	return(sec.join('.'));
}
function formatPercent(progress, total) {
	return(('' + ((progress / total) * 100)).split('.')[0] + '%');
}
//exports:
module.exports = {
	JSON: {
		load: function (fullpath, displayWarnings, evil) {
			return(new fibers(null, loadJSON, [fullpath, displayWarnings, evil]));
		},
		copy: copyJSON,
		merge: mergeJSON,
	},
	RegExp: {
		escape: escapeRegExp,
	},
	format: {
		seconds: formatSeconds,
		percent: formatPercent,
	},
};
