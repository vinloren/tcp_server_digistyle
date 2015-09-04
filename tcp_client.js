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
var myId = '5010001';
var idbox= 'hbox01'
var port = '8124';
var host = 'localhost';
var connected = false;	
var acked = false;
var reccnt = 0;		
var lastrec = '';
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
	logga(myId+' Connesso a server\n');
	// prepara e invia pacchetto dati
	client.write(prepData());
	connected = true;
});


function prepData() {
	var sensor1 = 'acqua1';
	var sensor2 = 'acqua2';
	var sensor3 = 'fumo';
	var alarm1  = '01';
	var alarm2  = '02';
	var alarmOK = '00';
	var stx = 2;
	var crc = stx;
	var etx = 3
	var TYPE= '\4'; // alarm
	
	var INFO = TYPE+myId+';'+sensor1+'='+alarm1+';';
		INFO += sensor2+'='+alarmOK+';'+sensor3+'='+alarm2+';';
	var len  = INFO.length+5;	
	var lh = Math.floor(len/256);
	var ll = len - 256*lh;
	var buff = new Buffer(len);
	
	buff[0] = stx;
	buff[1] = lh;
	crc ^= lh;
	buff[2] = ll;
	crc ^= ll;
	
	for (var i=0; i<INFO.length;i++) {
		crc ^= INFO.charCodeAt(i);
		buff[i+3] = INFO.charCodeAt(i);
	}
	buff[i+3] = crc;
	buff[i+4] = etx;
	lastrec = buff.toString('utf8');
	logga(myId+': invio '+buff.toString('hex')+'\nascii: '+lastrec+'\n');
	console.log(myId+': invio '+buff.toString('hex')+'\nascii: '+lastrec);
	return lastrec;
}

/**
var timer = setInterval(function() { 
		if(acked && reccnt < 10) {
			client.write(prepData());
			acked = false;
			reccnt++;
			logga(myId+' Inviato record '+reccnt+'\n');
		}
		else if(acked) {
			client.destroy();
		}
	}, 5000);
**/

function checkCRC(data) {
	var crc = 3;
	for(var i=0;i<data.length;i++) {
		crc ^= data.charCodeAt(i);
	}
	if (crc == 0) {
		reccnt = 0;
		if(data.charCodeAt(3) == 0x01) { // ack
			return true
		}
		else if(data.substring(3,7) == 'HANG') {
			sendAck();
			client.destroy();
		}
		return true;
	}
	return false;
}


function sendAck() {
	var crc = 0;
	var stx = 2;
	var etx = 3;
	var ack = '\1';
	var INFO = ack;
	var len = INFO.length+5;
	var buf = new Buffer(len);
	var lh = Math.floor(len/16);
	var ll = len - 16*lh;
	buf[0] = stx;
	crc ^= buf[0];
	buf[1] = lh;
	crc ^= buf[1];
	buf[2] = ll;
	crc ^= buf[2];
	for(var i=0;i<INFO.length;i++) {
		buf[3+i] = INFO.charCodeAt(i);
		crc ^= buf[3+i];
	}
	buf[3+i] = crc;
	buf[4+i] = etx;
	logga(myId+' invio ack\n');
	console.log(myId+' invio ack');
	client.write(buf.toString('utf8'));	
}


client.on('data',function(data) {
		
		var buff = new Buffer(data);
		var asc = buff.toString('utf8');
		var hex = buff.toString('hex');
		console.log(myId+': ricevo '+hex+'\nascii '+asc);
		logga(myId+': ricevo '+hex+'\nascii '+asc+'\n');
		
		if(hex === '05') {
			// ricevuto nack a richiesta di connessione
			logga(myId+' ricevuto nack a connect.\n');
			console.log(myId+' ricevuto nack a connect.');
			return;
		}
		
		if(checkCRC(data.toString())) {
			console.log(myId+' Messaggio inviato OK.');
			logga(myId+' Messaggio inviato OK.\n');			
		}
		else {
			
			if(reccnt>2) {
				console.log(myId+' Errore checksum, chiudo connessione.');
				logga(myId+' Errore checksum, chiudo connessione.\n');
				client.destroy();		
			}
			else {
				console.log(myId+' Errore checksum, reinvio record.');
				logga(myId+' Errore checksum, reinvio record\n');
				reccnt++;
				client.write(lastrec);
			}		
		}
});

client.on('error', function(err) {
	console.log(err.toString());
	logga(err.toString()+'\n');
	process.exit();	
});

client.on('close',function() {
	console.log('Connesione chiusa');
	logga('Connessione chiusa\n');
	process.exit();
});
