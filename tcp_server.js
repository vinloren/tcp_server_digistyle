var net = require('net');
var util = require('util');
var process = require('process');
var Buffer = require('Buffer');
var fs = require('fs');
var moment = require("moment");
var writeStream = fs.createWriteStream('./tcpserver.log',
	{'flags' : 'a',
	 'encoding' : 'utf8',
	 'mode' : 0x1b6});

var connSql = [];
var connessioni = [];
var conndata = [];
var callerID = [];
var cliente = {};
var Connection = require('tedious').Connection;
var Request = require('tedious').Request;

var config = {
        userName: 'sa',
        domainName: "localhost.localdomain",
        password: 'scdvbisa',
        server: 'localhost',
        options: {
            port: '1433',
            database: 'homebox'
        }
    };

var port = '8124';
process.argv.forEach(function (val, index, array) {
	switch(index) {
		case 2:
			port = val;
			console.log(index + ' port: ' + val);
			break;
	}
});	

var logga = function(log) { 
				var now = moment(new Date());
				writeStream.write(now.format("DD/MM/YYYY HH:mm:ss.SSS")+' '+log,'utf8',function(err) {
					if(err) throw err;
				});
		    }
			
var connection;
var conndx = 0;
var MAXCONN = 10;
var c = 0;

// crea pool di MAXCONN connessioni a DB da usare  
// per future 10 connessioni TCP
function getConn() {
	connection = new Connection(config);
    connection.on('connect' , function(err) {
    	// If no error, then good to go...
    	if(err) {
        	util.log('Errore connessione DB: %s',err);
			logga('Errore connessione DB: '+err.toString()+'\n');
			process.exit();
		}
    	else {
			var csql = {};
			csql.conn = connection;
			csql.busy = false;
			connSql.push(csql);
        	util.log('DB connesso per conn'+c);
			logga('DB connesso per conn'+c+'\n');
			c++;
			if(c < MAXCONN) {
				getConn();
			}
		}
    });	
}

getConn();

/**
process.on('uncaughtException', function(err) {
  util.log('Exception: ' + err);
  logga('Exception: ' + err + '\n');
});
**/

function setBusy(obj) {
	for(var i=0;i<connSql.length;i++) {
		if(obj.conn == connSql[i].conn) {
			break;
		}
	}
	connSql[i].busy = true;
}

function clearBusy(obj) {
	for(var i=0;i<connSql.length;i++) {
		if(obj.conn == connSql[i].conn) {
			break;
		}
	}
	connSql[i].busy = false;
}


var carica0 = function caricaRecord(qr,sqlobj,conx) {  
		var csql = sqlobj.conn;
       	var callback = function(err, rowCount) {	   				
       	if (err) {
                 util.log(conx.remotePort+': '+err);
				 var nack = getMsg(5);
				 conx.write(nack);
				 clearBusy(sqlobj);
				 logga(conx.remoteport+': '+err.toString()+'\n');			
                } 
				else {
                  util.log(conx.remotePort+': '+rowCount + ' rows');
				  logga("Inserito "+rowCount+' record\n');
				  var ack = getMsg(1);
				  conx.write(ack);
				  var hangup = getMsg(6);
				  conx.write(hangup);
				  logga(conx.remotePort+': Ok insert su msQl_con0\n');
                  clearBusy(sqlobj);
				}
						
        };
		var request = new Request(qr,callback);
		setBusy(sqlobj);
       	csql.execSql(request);	   
}

var carica1 = function caricaRecord(qr,sqlobj,conx) { 
	   	var csql = sqlobj.conn;
       	var callback = function(err, rowCount) {	   				
       	if (err) {
                 util.log('carica1 '+conx.remotePort+': '+err);
				 var nack = getMsg(5);
				 conx.write(nack);
				 clearBusy(sqlobj);
				 logga('carica1 '+conx.remotePort+': '+err.toString()+'\n');			
                } 
				else {
                  util.log(conx.remotePort+': '+rowCount + ' rows');
				  logga("Inserito "+rowCount+' record\n');
				  var ack = getMsg(1);
				  conx.write(ack);
				  var hangup = getMsg(6);
				  connessioni[1].write(hangup);
				  clearBusy(sqlobj);
				  logga(conx.remotePort+': Ok insert su msQl_conn1\n');
                }
						
        };
		var request = new Request(qr,callback);
		setBusy(sqlobj);
       	csql.execSql(request);	   
}

var carica2 = function caricaRecord(qr,sqlobj,conx) { 
		var csql = sqlobj.conn;   
       	var callback = function(err, rowCount) {	   				
       	if (err) {
                 util.log('carica2 '+conx.remotePort+': '+err);
				 var nack = getMsg(5);
				 conx.write(nack);
				 clearBusy(sqlobj);
				 logga('carica2 '+conx.remotePort+': '+err+'\n');			
                } 
				else {
                  util.log(conx.remotePort+': '+rowCount + ' rows');
				  logga("Inserito "+rowCount+' record\n');
				  var ack = getMsg(1);
				  conx.write(ack);
				  var hangup = getMsg(6);
				  conx.write(hangup);
				  clearBusy(sqlobj);
				  logga(conx.remotePort+': Ok insert su msQl_con2\n');
                }
						
        };
		var request = new Request(qr,callback);
		setBusy(sqlobj);
       	csql.execSql(request);	   
}

var carica3 = function caricaRecord(qr,sqlobj,conx) {   
		var csql = sqlobj.conn; 
       	var callback = function(err, rowCount) {	   				
       	if (err) {
                 util.log('carica3 '+conx.remotePort+': '+err);
				 var nack = getMsg(5);
				 conx.write(nack);
				 clearBusy(sqlobj);
				 logga('carica3 '+conx.remotePort+': '+err.toString()+'\n');			
                } 
				else {
                  util.log(conx.remotePort+': '+rowCount + ' rows');
				  logga("Inserito "+rowCount+' record\n');
				  var ack = getMsg(1);
				  conx.write(ack);
				  var hangup = getMsg(6);
				  conx.write(hangup);
				  clearBusy(sqlobj);
				  logga(conx.remotePort+': Ok insert su msQl_con3\n');
                }
						
        };
		var request = new Request(qr,callback);
		setBusy(sqlobj);
       	csql.execSql(request);	   
}

var carica4 = function caricaRecord(qr,sqlobj,conx) {  
		var csql = sqlobj.conn;      
       	var callback = function(err, rowCount) {	   				
       	if (err) {
                 util.log('carica4 '+conx.remotePort+': '+err);
				 var nack = getMsg(5);
				 conx.write(nack);
				 clearBusy(sqlobj);
				 logga('carica4 '+conx.romotePort+': '+err.toString()+'\n');			
                } 
				else {
                  util.log(conx.remotePort+': '+rowCount + ' rows');
				  logga("Inserito "+rowCount+' record\n');
				  var ack = getMsg(1);
				  conx.write(ack);
				  var hangup = getMsg(6);
				  conx.write(hangup);
				  clearBusy(sqlobj);
				  logga(conx.remotePort+': Ok insert su msQl_con4\n');
                }
						
        };
		var request = new Request(qr,callback);
		setBusy(sqlobj);
       	csql.execSql(request);	   
}

var carica5 = function caricaRecord(qr,sqlobj,conx) {  
		var csql = sqlobj.conn;      
       	var callback = function(err, rowCount) {	   				
       	if (err) {
                 util.log('carica5 '+conx.remotePort+': '+err);
				 var nack = getMsg(5);
				 conx.write(nack);
				 clearBusy(sqlobj);
				 logga('carica5 '+conx.remotePort+': Errore su mSql_conn5\n'+err.toString()+'\n');			
                } 
				else {
                  util.log(conx.remotePort+': '+rowCount + ' rows');
				  logga("Inserito "+rowCount+' record\n');
				  var ack = getMsg(1);
				  conx.write(ack);
				  var hangup = getMsg(6);
				  conx.write(hangup);
				  clearBusy(sqlobj);
				  logga(conx.remotePort+': Ok insert su msQl_con5\n');
                }
						
        };
		var request = new Request(qr,callback);
		setBusy(sqlobj);
       	csql.execSql(request);	   
}

var carica6 = function caricaRecord(qr,sqlobj,conx) { 
		var csql = sqlobj.conn;        
       	var callback = function(err, rowCount) {	   				
       	if (err) {
                 util.log('carica6 '+conx.remotePort+': '+err);
				 var nack = getMsg(5);
				 conx.write(nack);
				 clearBusy(sqlobj);
				 logga('carica6 '+conx.remotePort+': '+err.toString()+'\n');			
                } 
				else {
                  util.log(conx.remotePort+': '+rowCount + ' rows');
				  logga("Inserito "+rowCount+' record\n');
				  var ack = getMsg(1);
				  conx.write(ack);
				  var hangup = getMsg(6);
				  conx.write(hangup);
				  clearBusy(sqlobj);
				  logga(conx.remotePort+': Ok insert su msQl_conn6\n');
                }
						
        };
		var request = new Request(qr,callback);
		setBusy(sqlobj);
       	csql.execSql(request);	   
}

var carica7 = function caricaRecord(qr,sqlobj,conx) {  
		var csql = sqlobj.conn;   
       	var callback = function(err, rowCount) {	   				
       	if (err) {
                 util.log('carica7 '+conx.remotePort+': '+err);
				 var nack = getMsg(5);
				 conx.write(nack);
				 clearBusy(sqlobj);
				 logga('carica7 '+conx.remotePort+': '+err.toString()+'\n');			
                } 
				else {
                  util.log(conx.remotePort+': '+rowCount + ' rows');
				  logga("Inserito "+rowCount+' record\n');
				  var ack = getMsg(1);
				  conx.write(ack);
				  var hangup = getMsg(6);
				  conx.write(hangup);
				  clearBusy(sqlobj);
				  logga(conx.remotePort+': Ok insert su msQl_conn7\n');
                }
						
        };
		var request = new Request(qr,callback);
		setBusy(sqlobj);
       	csql.execSql(request);	   
}

var carica8 = function caricaRecord(qr,sqlobj,conx) { 
		var csql = sqlobj.conn;    
       	var callback = function(err, rowCount) {	   				
       	if (err) {
                 util.log('carica8 '+conx.remotePort+': '+err);
				 var nack = getMsg(5);
				 conx.write(nack);
				 logga('carica8 '+conx.remorePort+': '+err.toString()+'\n');			
                 clearBusy(sqlobj);
				} 
				else {
                  util.log(conx.remotePort+': '+rowCount + ' rows');
				  logga("Inserito "+rowCount+' record\n');
				  var ack = getMsg(1);
				  conx.write(ack);
				  var hangup = getMsg(6);
				  conx.write(hangup);
				  clearBusy(sqlobj);
				  logga(conx.remotePort+': Ok insert su msQl_con8\n');
                }
						
        };
		var request = new Request(qr,callback);
		setBusy(sqlobj);
       	csql.execSql(request);	   
}

var carica9 = function caricaRecord(qr,sqlobj,conx) {
		var csql = sqlobj.conn;     
       	var callback = function(err, rowCount) {	   				
       	if (err) {
                 util.log('carica9 '+conx.remotePort+': '+err);
				 var nack = getMsg(5);
				 conx.write(nack);
				 logga('carica9 '+conx.remotePort+': '+err.toString()+'\n');			
                 clearBusy(sqlobj);
				} 
				else {
                  util.log(conx.remotePort+': '+rowCount + ' rows');
				  logga("Inserito "+rowCount+' record\n');
				  var ack = getMsg(1);
				  conx.write(ack);
				  var hangup = getMsg(6);
				  conx.write(hangup);
				  clearBusy(sqlobj);
				  logga(conx.remotePort+': Ok insert su msQl_con9\n');
                }
						
        };
		var request = new Request(qr,callback);
		setBusy(sqlobj);
       	csql.execSql(request);	   
}


function getMsg(answ) {
		var crc = 0;
		var stx = 2;
		var etx = 3;
		var len = 6;
		var buf = new Buffer(len);
		var lh = Math.floor(len/256);
		var ll = len - 256*lh;
		buf[0] = stx;
		crc ^= buf[0];
		buf[1] = lh;
		crc ^= buf[1];
		buf[2] = ll;
		crc ^= buf[2];
		buf[3] = answ;
		crc ^= buf[3];	
		buf[4] = crc;
		buf[5] = etx;
		if(answ == 1) {
			answ = 'Ack';
		}
		else if(answ == 5) {
			answ = 'Nack';
		}
		else if(answ == 6) {
			answ = 'HANGUP'
		}
		util.log(callerID[conndx]+": invio risposta: "+answ+' '+buf.toString('hex'));
		logga(callerID[conndx]+": invio risposta: "+answ+' '+buf.toString('hex')+'\n');	
		return buf.toString('utf8');
}

	    
var server = net.createServer(function(conn) {
	
	cliente = {};
	cliente.ip   = conn.remoteAddress;
	cliente.port = conn.remotePort;
	
	if(connessioni.length+1 > connSql.length) {
		logga('Conn DB non pronta per conn'+connessioni.length+'\n');
		util.log('Conn DB non pronta per conn'+connessioni.length);
		conn.end(getMsg(5)); // send nack
		return;
	}
	
	
	connessioni.push(conn);
	
	if(connessioni.length > MAXCONN) {
		logga('MAXCONN raggiunto chiudo socket.\n');
		util.log('MAXCONN raggiunto chiudo socket.');
		conn.end(getMsg(5)); // send nack
		connessioni.slice(connessioni.length-1,1);
		return;
	}
	
	util.log('connected: '+ cliente.ip+' '+cliente.port);
	logga('connected: '+ cliente.ip+' '+cliente.port+'\n');
	//console.log(connessioni[connessioni.length-1]);
	//util.log(util.inspect(conn, true, null, true));
	server.getConnections(function(err,count) {
		if(err) {
			logga('getConnection: '+err.toString()+'\n');
			util.log('getConnection: '+err.toString()+'\n');
		}
		else {
			util.log("Current active connections count: "+count);
			logga("Current active connections count: "+count+'\n');
			for(var i=0;i<count;i++) {
				var tcpsqlObj = {};
				if(typeof connessioni[i].remotePort != 'undefined') {
					logga('Conn'+i+': '+connessioni[i].remotePort+'\n');
				}
				else {
					logga('conn'+i+' undefined la elimino\n');
					for(var j=i;j<count-1;j++) {
						connessioni[j] = connessioni[j+1];
					}
					connessioni.splice(j,1);
					count--;
				}	
			}
		}
	});
	
	function ToHex(buf) {
		var hex = buf.toString('hex');
		var ret = '';
		var i = 0;
		
		while(i<hex.length) {
			ret += hex.substring(i,i+2);
			i += 2;
			if(i%4 == 0) {
				ret += ' ';
			}
		}
		return ret;
	}
	
	// se il client chiude bruscamente si
	// entra qui piuttosto che a on close
	conn.on('error', function (err) {
		logga(err.toString()+'\n');
		util.log(err.toString());	
	});
	
	conn.on('data', function (data) {
		var len = data.length;
		if(len > 12) {
			len = 12;
		}
		util.log(data.toString('hex').substring(0,2*len) + ' from ' + 
			conn.remoteAddress + ' ' +
			conn.remotePort);
		
		logga('len='+data.length+' '+ToHex(data)+'\n');
	
		var i=0;
		connessioni.forEach(function() {
			if(connessioni[i] == conn) {
				conndx = i;
				return;
			}
			else
				i++;
		});	
	 	
		//console.log('hex recvd: '+data.toString('hex'));
		var datas = data.toString();
		if(!checkRec(datas)) {
			if(typeof callerID[i] == "undefined") {
				logga('conn'+i+' Errore checksum, rispondo nack\n');	
				util.log('conn'+i+' Errore checksum, rispondo nack');	
			}
			else {
				logga(callerID[i]+' Errore checksum, rispondo nack\n');	
				util.log(callerID+' Errore checksum, rispondo nack');	
			}
			sendResp(5);
			conndata[i] = '';
			return;
		}
		
		if (typeof conndata[i] == "undefined") {
			conndata[i] = ""
		}
		conndata[i] += datas;	
		
		logga('conndata['+i+'] = '+conndata[i]+'\n');
		var tipCall = 0;
		if(conndata[i].charCodeAt(3) == 0x01) {
			conndata[i] = '';
			logga('conn'+i+' '+callerID[i]+': ricevuto ack\n');
			util.log('conn'+i+' '+callerID[i]+': ricevuto ack');
			return;		
		}
		else if(conndata[i].charCodeAt(3) == 0x05) {
			// nack a HANGUP chiudo conn
			conn.end(getMsg(5)); // send nack e chiudi
			logga(callerID[i]+': ricevuto nack, chiudo connessione\n');
			util.log(callerID[i]+': ricevuto nack, chiudo connessione');
			return;
		}
		else if(conndata[i].charCodeAt(10) == 0x03 ||
				conndata[i].charCodeAt(10) == 0x04) {
			callerID[i] = conndata[i].substring(3,10);
			tipCall = conndata[i].charCodeAt(10);
		}
		
		
		if(insertData(conndata[i],tipCall)) {
				conndata[i] = '';
				// in attesa di completare gestione alive
				if(tipCall == 3) {
					sendResp(1); // send Ack
					sendResp(6); // hangup
				}	
		}
		else {
				sendResp(5); // send Nack
		}
	});
	
	
	function checkRec(data) {
		var crc = 3;
		for(var i=0;i<data.length;i++) {
			crc ^= data.charCodeAt(i);
		}
		if (crc == 0) {
			return true
		}
		util.log('crc = '+crc);
		return false;
	}
	
	
	function sendResp(answ) {
		conn.write(getMsg(answ));		
	}

	
	function getRtcDate(rtc) {
		var datetime = new Date();
		var ora = rtc.charCodeAt(0);
		datetime.setHours(ora);	
		var min = rtc.charCodeAt(1);
		datetime.setMinutes(min);
		var sec = rtc.charCodeAt(2);
		datetime.setSeconds(sec);
		var day = rtc.charCodeAt(4);	
		datetime.setDate(day);
		var mese = rtc.charCodeAt(5);
		datetime.setMonth(mese);
		var anno = rtc.charCodeAt(6)+2000;
		datetime.setFullYear(anno);
		var rtcDate = moment(datetime);
		return rtcDate.format("YYYY-MM-DD HH:mm:ss");
	}
	
	
	function insertData(dats,tipCall) {
		
		var qr = "INSERT into ";
		var starts = 3; // inizio dati in dats string
		if(tipCall == 4) { // chiamata di allarme
			qr += 'alarm (boxId,rtc,sensSn) values(';	
			var hbsn = dats.substring(starts,starts+7);  // 7 char ascci hb S/n
			qr += hbsn+',';
			starts += 8; // salto tipo conn (alive o alarm)
			var rtchb = dats.substring(starts,starts+7); // rtc homebox
			qr += "'"+getRtcDate(rtchb)+"',";
			starts += 7;
			qr += dats.substring(starts,starts+7)+');'	 // Sn sensore in allarme
			logga('conn'+conndx+' qr= '+qr+'\n');
			
			// cerca prima connSql libera
			//csql.conn = connection;
			//csql.busy = false;
			var i;
			for(i=0;i<connSql.length;i++) {
				if(!connSql[i].busy) {
					break;
				}
			}
			
			if(i == connSql.length) {
				// tutte le conn sql occupate, rispondi nack
				logga('(insertData) sql conns tutte occupate, rispondo nack\n');
				return false;
			}
			
			switch(conndx) {
				
				case 0:
					util.log("Carico0");
					carica0(qr,connSql[i],connessioni[conndx]);
					break;
				case 1:
					util.log("Carico1");
					carica1(qr,connSql[i],connessioni[conndx]);
					break;
				case 2:
					util.log("Carico2");
					carica2(qr,connSql[i],connessioni[conndx]);
					break;
				case 3:
					util.log("Carico3");
					carica3(qr,connSql[i],connessioni[conndx]);
					break;
				case 4:
					util.log("Carico4");
					carica4(qr,connSql[i],connessioni[conndx]);
					break;
				case 5:
					util.log("Carico5");
					carica5(qr,connSql[i],connessioni[conndx]);
					break;
				case 6:
					util.log("Carico6");
					carica6(qr,connSql[i],connessioni[conndx]);
					break;
				case 7:
					util.log("Carico7");
					carica7(qr,connSql[i],connessioni[conndx]);
					break;
				case 8:
					util.log("Carico8");
					carica8(qr,connSql[i],connessioni[conndx]);
					break;
				case 9:
					util.log("Carico9");
					carica9(qr,connSql[i],connessioni[conndx]);
					break;
			}
			
		}
		return true;
	}
	
	conn.on('close', function() {
		
		util.log('client '+conn._peername.address+' '+conn._peername.port+' closed conn');
		logga('conn port: '+conn._peername.port+' ha chiuso conn.\n');
		var i=0;
		connessioni.forEach(function() {
			util.log('conn'+i+': '+connessioni[i].remotePort);
			if(typeof connessioni[i].remotePort == 'undefined')
				return;
			else
				i++;
		});
		
		if(i<MAXCONN) {
			util.log("Elimino i="+i+" in array connessioni");
			logga("Elimino i="+i+' in array connessioni: '+conn._peername.port+'\n');
			if(i == connessioni.length-1) {
				connessioni.splice(i,1);
				conndata.splice(i,1);	
			}
			else {
					for(i=i;i<connessioni.length-1;i++) {
						connessioni[i] = connessioni[i+1];
						conndata[i] = conndata[i+1];
					}
					connessioni.splice(i,1);
					conndata.splice(i,1);	
			}
			util.log("Connessioni ora attive: "+connessioni.length);
			logga("Connessioni ora attive: "+connessioni.length+'\n');
			logga(callerID[i]+': client '+conn._peername.address+' '+conn._peername.port+' chiuso conn.\n');
		}
		else {
			util.log("ERRORE: cliente da chiudere NON trovato!");
			logga("ERRORE: cliente da chiudere NON trovato!\n");
		}
	});
}).listen(port);
console.log('listening on port '+port);