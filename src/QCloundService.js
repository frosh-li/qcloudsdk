
const http = require('http');
const https = require('https');
const fs = require('fs');
const Auth = require('./auth');
const Config = require('./config');
const crypto = require('crypto');
const COS = require('cos-nodejs-sdk-v5');
const path = require('path');
const comrequest = require('request');
/**
 * return the status message
 */
function statusText(status) {
    var statusText = 'unkown';

    switch (status) {
    case 200:
      statusText = 'HTTP OK';
      break;
    case 400:
      statusText = 'Bad Request';
      break;
    case 401:
      statusText = 'Unauthorized';
      break;
    case 403:
      statusText = 'Forbidden';
      break;
    case 500:
      statusText = 'Internal Server Error';
      break;
    }
    return statusText;
};

function  getrequest(protocol, params, request_body) {
	return new Promise((resolve, reject) => {
		let request = protocol.request(params, function(response) {
	        if( response.statusCode  !=  200 ){
	            return resolve({'httpcode':response.statusCode, 'code':response.statusCode , 'message':statusText(response.statusCode) , 'data':{}});
	        }

	        var body = '';
	        response.setEncoding('utf8');

	        response.on('data', function (chunk) {
	            body += chunk;
	        });
	        response.on('end', function(){
	            return resolve({'httpcode':response.statusCode, 'code':response.statusCode , 'message':statusText(response.statusCode) , 'data':JSON.parse(body)});
	        });

	        response.on('error', function(e){
	            return resolve({'httpcode':response.statusCode, 'code':response.statusCode , 'message': '' + e , 'data':{} });
	        });
	    });
		request.end(request_body);
		request.on('error', function(e) {
			return reject(e);
		})
	})

};

class QCloundServce {
	/**
	*	身份证识别
	*   imagePath 为 照片地址，需要是完整的http://开头的或者https开头
	*   cardType 默认为0   0为身份证正面  1位身份证反面
	*/
	idcardocr(imagePath,　cardType = 0) {
		return new Promise((resolve, reject) => {
			let sign  = Auth.appSign();

		    let request_body = '';

	        request_body = JSON.stringify({
	            appid: Config.appId,
	            card_type: cardType,
	            bucket: Config.bucket,
	            url_list: [
	                imagePath
	            ]
	        });

		    let params = {
		        hostname: Config.API_SERVER,
		        path: '/ocr/idcard',
		        method: 'POST',
		        headers: {
		            'Authorization': sign,
		            'Content-Length': request_body.length,
		            'Content-Type': 'application/json'
		        }
		    };

		    getrequest(http, params, request_body)
		    	.then((data) => {
		    		return resolve(data);
		    	})
		    	.catch(e => {
		    		return resolve({'httpcode': 0, 'code': 0, 'message':e.message, 'data': {}});
		    	});
		})

	}

	/**
	*	身份证识别 传文件方式
	*   imagePath 为 照片地址，需要是完整的http://开头的或者https开头
	*   cardType 默认为0   0为身份证正面  1位身份证反面
	*/
	idcardocrByFile(imagePath,　cardType = 0) {
		return new Promise((resolve, reject) => {
			let sign  = Auth.appSign();

		    comrequest.post({
		    	url:`http://${Config.API_SERVER}/ocr/idcard`,
		    	formData: {
		    		appid: Config.appId,
		            card_type: cardType,
		            bucket: Config.bucket,
		            image: {
		            	value: fs.createReadStream(path.resolve(__dirname, imagePath)),
		            	options: {
		            		filename: 'qcloudimage',
		            		contentType: 'image/jpeg',
		            	}
		            }
		    	},
		    	headers: {
		    		'Authorization': sign,
		            'Content-Type': 'multipart/form-data'
		    	}
		    }, (err, res, body){
		    	if(err){
		    		return reject(err);
		    	}
		    	return resolve(JSON.parse(body));
		    })

		})

	}

	/**
	* 将图片上传到腾讯对象存储中
	* 使用方法
	let service = new QCloundServce();



	service.updateCardImageToRemoteServer('../cards/1.jpeg', 0)
		.then(data =>{
			console.log("updateCardImageToRemoteServer:" + JSON.stringify(data));
			if(!data.Location){
				return;
			}
			service.idcardocr(data.Location, 0)
				.then(data =>{
					console.log("idcardocr:" + JSON.stringify(data));
				})
				.catch(e=>{
					console.log(e);
				});
		})
		.catch(e=>{
			console.log(e);
		});
	*/
	updateCardImageToRemoteServer(filepath) {
		console.log()
		let cos = new COS({
		    SecretId: Config.secretId,
		    SecretKey: Config.secretKey,
		});
		let stats = fs.statSync(filepath);
		let filesize = stats.size;
		let params = {
		    Bucket : `${Config.bucket}-${Config.appId}`,            /* 必须 */
		    Region : Config.region,            /* 必须 */
		    Key : 'test01',                /* 必须 */
		    ACL : '',                /* 非必须 */
		    GrantRead : '',         /* 非必须 */
		    GrantWrite : '',        /* 非必须 */
		    GrantFullControl : '',    /* 非必须 */
		    Body: fs.createReadStream(filepath),
		    ContentLength: filesize,
		    onProgress: function (progressData) {
		        console.log(progressData);
		    }
		};

		return new Promise((resolve, reject) => {
			cos.putObject(params, function(err, data) {
			    if(err) {
			        console.log(err);
			        return reject(err);
			    } else {
			        console.log(data);
			        return resolve(data);
			    }
			});
		})


	}
}

let service = new QCloundServce();

module.exports = service;