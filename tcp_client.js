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
	var rnd = Math.floor(Math.random()*2);
	client.write(prepData(3+rnd));	// scegli random conn alarm o conn alive
	
	/** per test caduta brusca conn lato clieln
	if(Math.floor(Math.random()*3)==2) {
			logga("Chiudo client in modo brusco..\n");
			process.exit();
			return;
	}
	**/	
});


function prepData(type) {
	// type: 3 = Alive 4 = Alarm
	var stx = 2;
	var crc = 3;
	var etx = 3
	var date = new Date();
	var time = date.getTime();
	var pwFailDate = new Date(time-4*89900000);
	var lastCommDate = new Date(time-2*86400);
	var sensDate = new Date(time-3*86400000); // vado indietro 3gg
	var fumoDate = new Date(time-2*89522000); // vado indietro circa 2gg
	var rtc = [];	
	var sensSn = ['7002141','7002142','7002143','7002144','7002145',
				  '7002146','7002147','7002148','7002149','7002150',
				  '6013001','6013002','6013003','6013004','6013005',
				  '6013006','6013007','6013008','6013009','6013010',
				  '6013011','6013012','6013013','6013014','6013015',
				  '6013016','6013017','6013018','6013019','6013020'];
	var fumoSn = ['8013101','8013102','8013103','8013104','8013105',
				  '8013106','8013107','8013108','8013109','8013110',
				  '8013111','8013112','8013131','8013114','8013115',
				  '8013116','8013117','8013118','8013119','8013120',
				  '8012121','8012122','8012123','8012124','8012125',
				  '8012126','8012127','8012128','8012129','8012130'];
	rtc[0] = date.getHours();
	rtc[1] = date.getMinutes();
	rtc[2] = date.getSeconds();
	rtc[3] = ';';
	rtc[4] = date.getDate();
	rtc[5] = date.getMonth();
	rtc[6] = date.getFullYear()-2000;
	var tipal = Math.floor(Math.random()*3);
	var aas = 1; // anomalia assenza sensori 0=nessun sens. affiliato
				 // 1=tutti sensori affiliati 2=uno+ sensori non visibili
	var pwfail = [];
	pwfail[0] = 0; 	// 0=nessun superamento soglia 1=superamento
					// in caso 1 segue rtc+;+2 bytes durata in multipli di
					// 100mS
	pwfail[1] = pwFailDate.getHours();   // ora evento
	pwfail[2] = pwFailDate.getMinutes(); // minuto evt
	pwfail[3] = pwFailDate.getSeconds(); // secondi
	pwfail[4] = ';';
	pwfail[5] = pwFailDate.getDate();    // giorno
	pwfail[6] = pwFailDate.getMonth();   // mese settembre
	pwfail[7] = pwFailDate.getFullYear()-2000; // anno evt
	pwfail[8] = ';'
	pwfail[9] = 0; 	// fail dutata 00 ovvero non presente
	pwfail[10] = 0; // fail dutata 00
	var sensor = [];
	sensor[0] = 0; 	// sensore acqua: 0000 fumo 0001
	sensor[1] = 0;
	var rn = Math.floor(Math.random()*30);
	for(var i=0;i<7;i++) {
		sensor[i+2] = sensSn[rn].charCodeAt(i);
	}
	sensor[9] = 1;	 // batteria high
	sensor[10] = sensDate.getHours(); 	// ora ultimo test
	sensor[11] = sensDate.getMinutes(); // minuto
	sensor[12] = sensDate.getSeconds(); // secondi
	sensor[13] = ';';
	sensor[14] = sensDate.getDate(); 	// giorno
	sensor[15] = sensDate.getMonth();	// mese settembre
	sensor[16] = sensDate.getFullYear()-2000; // anno evt
	sensor[17] = lastCommDate.getHours();   // ora ultima comunicazione
	sensor[18] = lastCommDate.getMinutes(); // minuto
	sensor[19] = lastCommDate.getSeconds(); // secondi
	sensor[20] = ';';
	sensor[21] = lastCommDate.getDate(); 	// giorno();
	sensor[22] = lastCommDate.getMonth();   // mese
	sensor[23] = lastCommDate.getFullYear()-2000; // anno evt
	var senfumo = [];
	senfumo[0] = 0;  // sensore fumo 0001
	senfumo[1] = 1;
	for(var i=0;i<7;i++) {
		senfumo[i+2] = fumoSn[rn].charCodeAt(i);
	}
	senfumo[9] = 2; 	// batteria medium
	senfumo[10] = fumoDate.getHours(); 		// ora ultimo test
	senfumo[11] = fumoDate.getMinutes(); 	// minuto
	senfumo[12] = fumoDate.getSeconds();	// secondi
	senfumo[13] = ';';
	senfumo[14] = fumoDate.getDate();		// giorno
	senfumo[15] = fumoDate.getMonth();	 	// mese settembre
	senfumo[16] = fumoDate.getFullYear()-2000;	// anno evt
	senfumo[17] = lastCommDate.getHours(); 	// ora ultima comunicazione
	senfumo[18] = lastCommDate.getMinutes();// minuto
	senfumo[19] = lastCommDate.getSeconds();// secondi
	senfumo[20] = ';';
	senfumo[21] = lastCommDate.getDate();	// giorno
	senfumo[22] = lastCommDate.getMonth(); 	// mese
	senfumo[23] = lastCommDate.getFullYear()-2000; // anno evt
	var len = 8+rtc.length+myId.length+pwfail.length+sensor.length+senfumo.length;
	var buff;
	var lh,ll,p;
	if(type == 3) {
		buff = new Buffer(len);
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
		buff[i+5+p] = tipal; // tipo alimentazione
		crc ^= tipal;		 // 0=rete 1=batt. 2= batt. in esaur.
		for(var p1=0;p1<pwfail.length;p1++) {
			buff[i+6+p+p1] = pwfail[p1];
			crc ^= pwfail[p1];
		}
		for(var q=0;q<sensor.length;q++) {
			buff[i+6+p+p1+q] = sensor[q];
			crc ^= sensor[q];
		}
		for(var n=0;n<senfumo.length;n++) {
			buff[i+6+p+p1+q+n] = senfumo[n];
			crc ^= senfumo[n];
		}
		buff[i+6+p+p1+q+n] = crc;
		buff[i+7+p+p1+q+n] = etx;
	}
	else if(type == 4) {
		len = 27; // stx-lh-ll-myID(7)-04-rtc(7)-sensS/n(7)-crc-etx
		buff = new Buffer(len);
		buff[0] = stx;
		crc ^= buff[0];
		buff[1] = 0;
		buff[2] = len;
		crc ^= buff[2];
		for(i=0;i<7;i++) {
			buff[3+i] = myId.charCodeAt(i);
			crc ^= buff[3+i];
		}
		buff[3+i] = 4;
		crc ^= 4;
		for(p=0;p<rtc.length;p++) {
			buff[4+i+p] =  rtc[p];
			crc ^= rtc[p];
		}
		// prendi un S/n sensore fra i 20 prestabiliti
		var sndx = Math.floor(Math.random()*20);
		for(var p1=0;p1<7;p1++) {
			buff[4+i+p+p1] = sensSn[sndx].charCodeAt(p1);
			crc ^= buff[4+i+p+p1];
		}
		buff[4+i+p+p1] = crc^etx;
		buff[5+i+p+p1] = etx;
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
		/** per test chiusura brusca client effetto su server 
		if(Math.floor(Math.random()*3)==2) {
			logga("Chiudo client in modo brusco..\n");
			process.exit();
			return;
		}
		**/
		// controlla se per caso data.len < > = messaggio singolo
		if(data[0] != stx && lastrcv == '') {
			// ricevuto fuffa, chiudi socket o nack se non coda di msg incompleto
			util.log(myId+': Manca stx in messaggio, rispondo Nack');
			logga(myId+': Manca stx in messaggio, rispondo Nack\n');
			reccnt++;
			if(reccnt>2) {
				logga(myId+' Chiudo socket\n');
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
						logga(myId+' Chiudo socket\n');
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
	logga(myId+' Connessione chiusa\n');
	process.exit();
});
