'use strict';
const slice = Array.prototype.slice,
	fs = require('fs'),
	path = require('path'),
	CarbonFiber = require('./carbon.fibers'),
	child = require('child_process'),
	FileSystem = module.exports = {
		exists: function (filename) {
			return(new CarbonFiber(null, exists, [filename]));
		},
		mkdirp: function (directory) {
			//console.log('mkdirp: ', directory);
			return(new CarbonFiber(null, mkdirp, [path.resolve(directory).replace(/[\\\/]*$|[\\\/]+/g, '/')])
				//.on('done', function (error, result) { console.log('mkdirp: ', result, 'E: '+error); }))
				);
		},
		rmdirp: function (directory) {
			//console.log('rmdirp: ', directory);
			return(new CarbonFiber(null, rmdirp, [path.resolve(directory).replace(/[\\\/]*$|[\\\/]+/g, '/')])
				//.on('done', function (error, result) { console.log('rmdirp: ', result, 'E: '+error); }))
				);
		},
		readdirc: function (directory) {
			//console.log('readdirc: ', directory);
			return(new CarbonFiber(null, readdirc, [[], path.resolve(directory).replace(/[\\\/]*$|[\\\/]+/g, '/')])
				//.on('done', function (error, result) { console.log('readdirc: ', result, 'E: '+error); }))
				);
		},
		movedir: function (directory, destination, pipeOutput) {
			const promise = new CarbonFiber(child, child.exec, [
				(/^win/.test(process.platform) ? 'move' : 'mv -f') +
				' ' + JSON.stringify(path.resolve(directory)) +
				' ' + JSON.stringify(destination)]);
			if (pipeOutput) {
				promise.on('returned', function (renamingProcess) {
					renamingProcess.stdout.pipe(process.stdout);
					renamingProcess.stderr.pipe(process.stderr);
				});
			}
			return promise;
		},
		xcopy: function (directory, destination, pipeOutput) {
			directory = JSON.stringify(path.resolve(directory));
			destination = JSON.stringify(path.resolve(destination));
			const promise = new CarbonFiber(child, child.exec, [
				(/^win/.test(process.platform) ?
					('xcopy ' + directory + ' ' + destination + ' /E') :
					('cp -r ' + directory + ' ' + destination)), {
						maxBuffer: 1024*1024*1024,
					}]);
			if (pipeOutput) {
				promise.on('returned', function (xcopyProcess) {
					xcopyProcess.stdout.pipe(process.stdout);
					xcopyProcess.stderr.pipe(process.stderr);
				});
			}
			return promise;
		},
	};
FileSystem.__proto__ = fs;
Object.keys(fs).forEach(function (property) {
	const method = fs[property];
	if (!/^[A-Z_]|create|watch|exist|Sync$/.test(property) && fs[property] instanceof Function) {
		FileSystem[property] = function () {
			const args = slice.call(arguments);
			return(new CarbonFiber(fs, method, args));
		};
	}
});
function exists(filename, callback) {
	fs.exists(filename, function (exists) {
		callback(null, exists);
	});
}
function mkdirp(directory, callback) {
	const parent = directory.replace(/[^\\\/]+[\\\/]*$/, '');
	if (!parent) {
		callback(new Error('Parent Directory can not be resolved.'));
	} else {
		fs.exists(parent, function (exists) {
			if (!exists) {
				mkdirp(parent, function (error) {
					if (error) {
						callback(error);
					} else {
						fs.mkdir(directory, callback);
					}
				});
			} else {
				fs.mkdir(directory, callback);
			}
		});
	}
}
function readdirc(list, directory, callback) {
	let pending = 0;
	fs.readdir(directory, function (error, filenames) {
		if (error) { return(complete(error)); }
		if (filenames.length > 0) {
			return(filenames.forEach(function (filename) {
				if (pending >= 0) {
					filename = directory + filename;
					pending += 1;
					fs.lstat(filename, function (error, stat) {
						if (pending >= 0) {
							if (error) { return(complete(error)); }
							if (stat.isDirectory()) {
								list.push(filename + '/');
								return(readdirc(list, filename + '/', complete));
							}
							list.push(filename);
							complete();
						}
					});
				}
			}));
		}
		pending += 1;
		complete();
	});
	function complete(error) {
		if (error) {
			pending = -1;
			return(callback(error));
		}
		pending -= 1;
		if (!pending) {
			return(callback(null, list));
		}
	}
}
function rmdirp(directory, callback) {
	let pending = 0;
	fs.readdir(directory, function (error, filenames) {
		if (error) { return(callback(error)); }
		if (filenames.length > 0) {
			return(filenames.forEach(function (filename) {
				if (pending >= 0) {
					filename = directory + filename;
					pending += 1;
					fs.lstat(filename, function (error, stat) {
						if (pending >= 0) {
							if (error) { return(callback(error)); }
							if (stat.isDirectory()) {
								return(rmdirp(filename + '/', complete));
							}
							fs.unlink(filename, complete);
						}
					});
				}
			}));
		}
		pending += 1;
		complete();
	});
	function complete(error) {
		if (error) {
			pending = -1;
			return(callback(error));
		}
		pending -= 1;
		if (!pending) {
			fs.rmdir(directory, callback);
		}
	}
}