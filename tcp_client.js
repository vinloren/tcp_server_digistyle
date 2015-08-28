#!/usr/local/bin/node
var net = require('net');
var client = new net.Socket();
var fs = require('fs');
var moment = require("moment");
var writeStream = fs.createWriteStream('./tcpclient.log',
	{'flags' : 'a',
	 'encoding' : 'utf8',
	 'mode' : 0x1b6});
	 
var logga = function(log) { 
				var now = moment(new Date());
				writeStream.write(now.format("DD MMM YYYY HH:MM:ss.SSS")+' '+log,'utf8',function(err) {
					if(err) throw err;
				});
		    }
var myId = '3334177441';
var port = '8124';
var host = 'localhost';
var connected = false;	
var reccnt = 0;		
process.argv.forEach(function (val, index, array) {
	switch(index) {
		case 2:
			myId = val;
			console.log(index + ' myId: ' + val);
			break;
		case 3:
			port = val;
			console.log(index + ' port: ' + val);
			break;
		case 4:
			host = val;
			console.log(index + ' host: ' + val);
	}
});

client.setEncoding('utf8');
// connect to server
client.connect (port,host, function () {
	console.log('connected to server');
	//client.write('>');
	// prepara pacchetto dati
	var pkt = prepData();
	client.write(pkt);
	connected = true;
});


function prepData() {
	/** generarecord di 6 campi:
	[id] [bigint] NOT NULL,
	[tms] [int] NOT NULL,
	[lat] [real] NOT NULL,
	[long] [real] NOT NULL,
	[speed] [smallint] NOT NULL,
	[rotta] [real] NOT NULL,
	**/
	var record = myId+';';
	record += Math.floor(Date.now()/1000).toString()+';';
	var lat = Math.floor(Math.random()*20000)+440000;
	var long = Math.floor(Math.random()*20000)+90000;
	lat  /= 10000;
	long /= 10000;
	var speed= Math.floor(Math.random()*110);
	var rotta= Math.random()*360;
	record += lat.toString()+';';
	record += long.toString()+';';
	record += speed.toString()+';';
	rotta = Math.floor(rotta*10);
	rotta /= 10;
	record += rotta.toString()+'\n';
	return record;
}

var timer = setInterval(function() { 
		if(connected && reccnt < 10) {
			client.write(prepData());
			reccnt++;
		}
		else if(connected) {
			client.destroy();
		}
	}, 5000);


/**
// prepare for input from terminal
process.stdin.resume();
// when receive data, send to server
process.stdin.on('data', function (data) {
	client.write(data);
});
**/

// when receive data back, print to console
client.on('data',function(data) {
		console.log(data);
		logga(data+'\n');
});
// when server closed
client.on('close',function() {
	console.log('connection is closed');
	process.exit();
});
