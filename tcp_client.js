var net = require('net');
var client = new net.Socket();
var util = require('util');
var process = require('process');
var Buffer = require('Buffer');
var fs = require('fs');
var moment = require("moment");
var writeStream = fs.createWriteStream('./tcpclient.log',
	{'flags' : 'a',
	 'encoding' : 'utf8',
	 'mode' : 0x1b6});
	 
var logga = function(log) { 
				var now = moment(new Date());
				writeStream.write(now.format("DD/MM/YYYY HH:mm:ss.SSS")+' '+log,'utf8',function(err) {
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
var lastrcv = '';
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
	util.log('connected to server');
	logga(myId+' Connesso a server\n');
	// prepara e invia pacchetto dati
	client.write(prepData(3));
	connected = true;
});


function prepData(type) {
	// type: 3 = Alive 4 = Alarm
	var stx = 2;
	var crc = 3;
	var etx = 3
	var date = new Date();
	var rtc = [];
	rtc[0] = date.getHours();
	rtc[1] = date.getMinutes();
	rtc[2] = date.getSeconds();
	rtc[3] = ';';
	rtc[4] = date.getDay();
	rtc[5] = date.getMonth();
	rtc[6] = date.getFullYear()-2000;
	var aas = 1; // anomalia assenza sensori 0=nessun sens. affiliato
				 // 1=tutti sensori affiliati 2=uno+ sensori non visibili
	var pwfail = [];
	pwfail[0] = 0; 	// 0=nessun superamento soglia 1=superamento
					// in caso 1 segue rtc+;+2 bytes durata in multipli di
					// 100mS
	pwfail[1] = 15; // ora evento
	pwfail[2] = 30; // minuto evt
	pwfail[3] = 22;	// secondi
	pwfail[4] = ';';
	pwfail[5] = 4;	// giorno
	pwfail[6] = 9;  // mese
	pwfail[7] = 15  // anno evt
	pwfail[8] = ';'
	pwfail[9] = 0;  // fail non registrata
	pwfail[10] = 0;  // fail dutata 00 ovvero non presente
	var sensor = [];
	sensor[0] = 0; // sensore acqua
	sensor[1] = 0;
	sensor[2] = '7'; // s/n sensore 7 bytes ascii
	sensor[3] = '0'; // s/n sensore 7 bytes ascii
	sensor[4] = '0'; // s/n sensore 7 bytes ascii
	sensor[5] = '1'; // s/n sensore 7 bytes ascii
	sensor[6] = '0'; // s/n sensore 7 bytes ascii
	sensor[7] = '0'; // s/n sensore 7 bytes ascii
	sensor[8] = '1'; // s/n sensore 7 bytes ascii
	sensor[9] = 1;	 // batteria high
	sensor[10] = 15; // ora ultimo test
	sensor[11] = 30; // minuto
	sensor[12] = 22; // secondi
	sensor[13] = ';';
	sensor[14] = 4;	 // giorno
	sensor[15] = 9;  // mese
	sensor[16] = 15  // anno evt
	sensor[17] = 15; // ora ultima comunicazione
	sensor[18] = 41; // minuto
	sensor[19] = 16; // secondi
	sensor[20] = ';';
	sensor[21] = 4;	 // giorno
	sensor[22] = 9;  // mese
	sensor[23] = 15  // anno evt
	var senfumo = [];
	senfumo[0] = 0;
	senfumo[1] = 1;
	senfumo[2] = '8'; // s/n sensore 7 bytes ascii
	senfumo[3] = '0'; // s/n sensore 7 bytes ascii
	senfumo[4] = '0'; // s/n sensore 7 bytes ascii
	senfumo[5] = '1'; // s/n sensore 7 bytes ascii
	senfumo[6] = '0'; // s/n sensore 7 bytes ascii
	senfumo[7] = '0'; // s/n sensore 7 bytes ascii
	senfumo[8] = '2'; // s/n sensore 7 bytes ascii
	senfumo[9] = 2; // batteria medium
	senfumo[10] = 15; // ora ultimo test
	senfumo[11] = 30; // minuto
	senfumo[12] = 22; // secondi
	senfumo[13] = ';';
	senfumo[14] = 4;	// giorno
	senfumo[15] = 9;  	// mese
	senfumo[16] = 15  	// anno evt
	senfumo[17] = 16; 	// ora ultima comunicazione
	senfumo[18] = 41; 	// minuto
	senfumo[19] = 16; 	// secondi
	senfumo[20] = ';';
	senfumo[21] = 4;	// giorno
	senfumo[22] = 9;  	// mese
	senfumo[23] = 15 	// anno evt
	var len = 7+rtc.length+myId.length+pwfail.length+sensor.length+senfumo.length;
	var buff = new Buffer(len);
	var lh,ll,i,p;
	if(type == 3) {
		buff[0] = stx;
		crc ^= stx;
		lh = Math.floor(len/256);
		ll = len - 256*lh;
		buff[1] = lh;
		crc ^= lh;
		buff[2] = ll;
		crc ^= ll;
		for(i=0;i<7;i++) {
			buff[3+i] = myId.charCodeAt(i);
			crc ^= buff[3+i];
		}
		buff[i+3] = type;
		for(p=0;p<rtc.length;p++) {
			buff[p+i+4] = rtc[p];
			crc ^= rtc[p];
		}
		buff[i+4+p] = aas;
		crc ^= aas;
		for(var p1=0;p1<pwfail.length;p1++) {
			buff[i+5+p+p1] = pwfail[p1];
			crc ^= pwfail[p1];
		}
		for(var q=0;q<sensor.length;q++) {
			buff[i+5+p+p1+q] = sensor[q];
			crc ^= sensor[q];
		}
		for(var n=0;n<senfumo.length;n++) {
			buff[i+5+p+p1+q+n] = senfumo[n];
			crc ^= senfumo[n];
		}
		buff[i+5+p+p1+q+n] = crc;
		buff[i+6+p+p1+q+n] = etx;
	}
	
	lastrec = buff.toString('utf8');
	logga(myId+': invio '+buff.toString('hex')+'\nascii: '+lastrec+'\n');
	util.log(myId+': invio '+buff.toString('hex')+'\nascii: '+lastrec);
	return lastrec;
}


function checkCRC(data) {
	var crc = 3;
	for(var i=0;i<data.length;i++) {
		crc ^= data.charCodeAt(i);
	}
	if (crc == 0) {
		reccnt = 0;
		if(data.charCodeAt(3) == 0x01) { // ack
			util.log(myId+': Ricevuto Ack');
			logga(myId+': Ricevuto Ack\n');
			return true
		}
		else if(data.charCodeAt(3) == 0x06) { // hangups
			sendAck('\1');
			util.log(myId+': Ricevuto Hangup, chiudo socket.');
			logga(myId+': Ricevuto Hangup, chiudo socket.\n');
			client.destroy();
		}
		else if(data.charCodeAt(3) == 0x05) { // nack
			util.log(myId+': Ricevuto Nack, chiudo socket.');
			logga(myId+': Ricevuto nack, chiudo socket.\n');
			client.destroy();
			return true
		}
		return true;
	}
	return false;
}


function sendAck(ack) {
	var crc = 0;
	var stx = 2;
	var etx = 3;
	var INFO = ack;
	var len = INFO.length+5;
	var buf = new Buffer(len);
	var lh = Math.floor(len/256);
	var ll = len - 256*lh;
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
	util.log(myId+' invio ack');
	client.write(buf.toString('utf8'));	
}


function checkMsg(msg) {
	if(checkCRC(msg)) {
		util.log(myId+' Messaggio inviato OK.');
		logga(myId+' Messaggio inviato OK.\n');	
		reccnt = 0;		
	}
	else {
		reccnt++;
		lastrcv = '';
		if(reccnt>2) {
			util.log(myId+' Errore checksum, chiudo connessione.');
			logga(myId+' Errore checksum, chiudo connessione.\n');
			client.destroy();
		}
		else {
			util.log(myId+' Errore checksum, reinvio record.');
			logga(myId+' Errore checksum, reinvio record\n');
			client.write(lastrec);
		}	
	}
}


client.on('data',function(data) {
		
		var stx = '\2';
		var buff = new Buffer(data);
		var asc = buff.toString('utf8');
		var hex = buff.toString('hex');
		var len;
		var msg;
		util.log(myId+': ricevo '+hex+'\nascii '+asc);
		logga(myId+': ricevo '+hex+'\nascii '+asc+'\n');
		
		if(hex === '05') {
			// ricevuto nack a richiesta di connessione
			logga(myId+' ricevuto nack a connect.\n');
			util.log(myId+' ricevuto nack a connect.');
			return;
		}
		
		// controlla se per caso data.len < > = messaggio singolo
		if(data[0] != stx && lastrcv == '') {
			// ricevuto fuffa, chiudi socket o nack se non coda di msg incompleto
			util.log(myId+': Manca stx in messaggio, rispondo Nack');
			logga(myId+': Manca stx in messaggio, rispondo Nack\n');
			reccnt++;
			if(reccnt>2) {
				client.destroy(); // chiudo socket
			}
			else {
				sendAck('\5'); // send Nack
			}
			return;
		}
		else if(lastrcv != '') {
			// comletiamo msg incompleto
			lastrcv += asc;
			len = lastrcv.charCodeAt(1)+256+lastrcv.charCodeat(2);
			if(lastrcv.length < len) {
				util.log(myId+': Ricevuto msg incompleto, aspetto concludione.');
				logga(myId+': Ricevuto msg incompleto, aspetto concludione.\n');
				return;	
			}
			else if(lastrcv.length > len) { // ricevuto un msg + inizio un altro
				msg = lastrcv.substring(0,len);
				lastrcv = lastrcv.substring(len, lastrcv.length); // lastrcv=inizio new msg
				checkMsg(msg);
				
			}
			else { // messaggio completo ricevuto
				checkMsg(lastrcv);
				lastrcv = '';
			}		
		}
		else if(lastrcv == '') {
			// controlla lunghezza msg ricevuto
			len = asc.charCodeAt(1)*256+asc.charCodeAt(2);
			//console.log('len='+len+' datalen='+data.length);
			if (data.length	< len) { // messaggio ricevuto incompleto 
									 // aspetta ricevere nuovo buffer
				lastrcv += asc;
				util.log(myId+': Ricevuto msg incompleto, aspetto concludione.');
				logga(myId+': Ricevuto msg incompleto, aspetto concludione.\n');
				return;	
			}
			else if(data.length	== len) {
				lastrcv = '';
				checkMsg(asc);
			}
			else { // ricevuto un messaggio e seguente compiuto o meno
				msg = asc.substring(0,len);
				lastrcv = asc.substring(len,data.length);
				checkMsg(msg);
				if(lastrcv.charCodeAt(0) == 2) { // test stx
					len = lastrcv.charCodeAt(1)*256+lastrcv.charCodeAt(2);
					if(lastrcv.length == len) {
						checkMsg(lastrcv);
						lastrcv = '';
					}
					else if(len > lastrcv.length) { // messaggio incompleto, attendi conclusione
						util.log(myId+': Ricevuto msg incompleto, aspetto concludione.');
						logga(myId+': Ricevuto msg incompleto, aspetto concludione.\n');		
					}
					else { // messaggio contiene pezzo del prossiomo
						msg = lastrcv.substring(0,len);
						lastrcv = lastrcv.substring(len,lastrcv.length);
						checkMsg(msg);
					}
				}
				else {
					// ricevuto fuffa, chiudi socket o nack se non coda di msg incompleto
					util.log(myId+': Manca stx in messaggio, rispondo Nack');
					logga(myId+': Manca stx in messaggio, rispondo Nack\n');
					reccnt++;
					if(reccnt>2) {
						client.destroy(); 	// chiudo socket
					}
					else {
						sendAck('\5'); 		// send Nack
					}
				}
			}
		}
});

client.on('error', function(err) {
	util.log(err.toString());
	logga(err.toString()+'\n');
	process.exit();	
});

client.on('close',function() {
	util.log('Connesione chiusa');
	logga('Connessione chiusa\n');
	process.exit();
});
