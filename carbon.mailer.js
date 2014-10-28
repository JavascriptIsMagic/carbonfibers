const slice = Array.prototype.slice,
	fibers = require('./carbon.fibers'),
	mailer = require('nodemailer'),
	ejs = fibers.ejs,
	fs = fibers.fs;
module.exports = CarbonMailer;
function CarbonMailer(options) {
	if (!(this instanceof CarbonMailer)) {
		return new CarbonMailer(options);
	}
	this.__proto__ = mailer.createTransport("SES", options);
	this.sendMail = function (options) {
		return new fibers(this.__proto__, this.__proto__.sendMail, slice.call(arguments)).run();
	};
	this.renderSendMail = function (view, options, callback) {
		return fibers.fork(function () {
			const email = ((view instanceof Function) ?
				view(options) : ejs.render('' + view, options));
			this.sendMail({
				from: options.from,
				to: options.to,
				subject: /\<subject\>(.*?)\<\/subject\>/.exec(email)[1],
				html: /\<html\>(.*?)\<\/html\>/.exec(email)[1],
				text: /\<text\>(.*?)\<\/text\>/.exec(email)[1],
			}).wait();
		}.bind(this)).run();
	};
	this.renderFileSendMail = function (filename, options) {
		return fibers.fork(function () {
			this.renderSendMail(fs.readFile(filename).wait(), options).wait();
		}.bind(this)).run();
	};
}