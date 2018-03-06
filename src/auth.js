const Config = require('./config');
const crypto = require('crypto');

class Auth {
	constructor(props) {
		this.appId = Config.appId;
		this.secretId = Config.secretId;
		this.secretKey = Config.secretKey;
		this.bucket = Config.bucket;
		this.expire = Config.expire;
	}
	
	/**
	* 签名函数
	*/
	appSign() {
		let now = parseInt(Date.now() / 1000);
	    let pexpired = this.expire + now;
	    // the order of every key is not matter verify
	    let plainText = `a=${this.appId}&b=${this.bucket}&k=${this.secretId}&t=${now}&e=${pexpired}`;

	    let data = new Buffer(plainText,'utf8');
	    
	    let res = crypto.createHmac('sha1',this.secretKey).update(data).digest();
	    
	    let bin = Buffer.concat([res,data]);
	    
	    let sign = bin.toString('base64');

	    return sign;
	}
}

module.exports = new Auth();