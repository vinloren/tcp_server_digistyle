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
var conntms = [];	// timestamp apertura conn
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
		try {	   				
       		if (err) {
				    clearBusy(sqlobj);
                 	util.log(conx.remotePort+': '+err);
				 	var nack = getMsg(5);
				 	conx.write(nack);			
				 	logga(conx.remoteport+': '+err.toString()+'\n');			
                } 
				else {
					clearBusy(sqlobj);
                  	util.log(conx.remotePort+': '+rowCount + ' rows');
				  	logga("Inserito "+rowCount+' record\n');
				  	var ack = getMsg(1);
				  	conx.write(ack);
				  	var hangup = getMsg(6);
				  	conx.write(hangup);
				  	logga(conx.remotePort+': Ok insert su msQl_con0\n');
				}					
        	}	
			catch(xcp) {
				util.log('sql Ok, conn0 remote socket caduto.');	
				logga('sql Ok, conn0 remote socket caduto.\n');
			}
		};
		var request = new Request(qr,callback);
		setBusy(sqlobj);
       	csql.execSql(request);	   
}

var carica1 = function caricaRecord(qr,sqlobj,conx) { 
	   	var csql = sqlobj.conn;
       	var callback = function(err, rowCount) {
		try {		   				
       			if (err) {
                 	util.log('carica1 '+conx.remotePort+': '+err);
				 	var nack = getMsg(5);
				 	conx.write(nack);
				 	clearBusy(sqlobj);
				 	logga('carica1 '+conx.remotePort+': '+err.toString()+'\n');			
                } 
				else {
				  	clearBusy(sqlobj);
                  	util.log(conx.remotePort+': '+rowCount + ' rows');
				  	logga("Inserito "+rowCount+' record\n');
				  	var ack = getMsg(1);
				  	conx.write(ack);
				  	var hangup = getMsg(6);
				  	connessioni[1].write(hangup);
				  	logga(conx.remotePort+': Ok insert su msQl_conn1\n');
                }
			}
			catch(xcp) {
				util.log('sql Ok, conn1 remote socket caduto.');	
				logga('sql Ok, conn1 remote socket caduto.\n');
			}			
        };
		var request = new Request(qr,callback);
		setBusy(sqlobj);
       	csql.execSql(request);	   
}

var carica2 = function caricaRecord(qr,sqlobj,conx) { 
		var csql = sqlobj.conn;   
       	var callback = function(err, rowCount) {
		try {	   				
       			if (err) {
					clearBusy(sqlobj);  
                 	util.log('carica2 '+conx.remotePort+': '+err);
				 	var nack = getMsg(5);
				 	conx.write(nack);				 	
				 	logga('carica2 '+conx.remotePort+': '+err+'\n');			
                } 
				else {
					clearBusy(sqlobj);
                  	util.log(conx.remotePort+': '+rowCount + ' rows');
				  	logga("Inserito "+rowCount+' record\n');
				  	var ack = getMsg(1);
				  	conx.write(ack);
				  	var hangup = getMsg(6);
				  	conx.write(hangup);  
				  	logga(conx.remotePort+': Ok insert su msQl_con2\n');
                }	
			}
			catch(xcp) {
				util.log('sql Ok, conn2 remote socket caduto.');	
				logga('sql Ok, conn2 remote socket caduto.\n');
			}		
        };
		var request = new Request(qr,callback);
		setBusy(sqlobj);
       	csql.execSql(request);	   
}

var carica3 = function caricaRecord(qr,sqlobj,conx) {   
		var csql = sqlobj.conn; 
       	var callback = function(err, rowCount) {	
		try {   				
       		if (err) {
				   	clearBusy(sqlobj);
                 	util.log('carica3 '+conx.remotePort+': '+err);
				 	var nack = getMsg(5);
				 	conx.write(nack);				 
				 	logga('carica3 '+conx.remotePort+': '+err.toString()+'\n');			
                } 
				else {
					clearBusy(sqlobj);	
                  	util.log(conx.remotePort+': '+rowCount + ' rows');
				  	logga("Inserito "+rowCount+' record\n');
				  	var ack = getMsg(1);
				  	conx.write(ack);
				  	var hangup = getMsg(6);
				  	conx.write(hangup);	  
				  	logga(conx.remotePort+': Ok insert su msQl_con3\n');
                }
			}
			catch(xcp) {
				util.log('sql Ok, conn3 remote socket caduto.');	
				logga('sql Ok, conn3 remote socket caduto.\n');
			}				
        };
		var request = new Request(qr,callback);
		setBusy(sqlobj);
       	csql.execSql(request);	   
}

var carica4 = function caricaRecord(qr,sqlobj,conx) {  
		var csql = sqlobj.conn;      
       	var callback = function(err, rowCount) {	
		try {   				
       		if (err) {
				   	clearBusy(sqlobj);
                 	util.log('carica4 '+conx.remotePort+': '+err);
				 	var nack = getMsg(5);
				 	conx.write(nack);				 
				 	logga('carica4 '+conx.romotePort+': '+err.toString()+'\n');			
                } 
				else {
					clearBusy(sqlobj);
                  	util.log(conx.remotePort+': '+rowCount + ' rows');
				  	logga("Inserito "+rowCount+' record\n');
				  	var ack = getMsg(1);
				  	conx.write(ack);
				  	var hangup = getMsg(6);
				  	conx.write(hangup);	 
				  	logga(conx.remotePort+': Ok insert su msQl_con4\n');
                }
			}
			catch(xcp) {
				util.log('sql Ok, conn4 remote socket caduto.');	
				logga('sql Ok, conn4 remote socket caduto.\n');
			}			
        };
		var request = new Request(qr,callback);
		setBusy(sqlobj);
       	csql.execSql(request);	   
}

var carica5 = function caricaRecord(qr,sqlobj,conx) {  
		var csql = sqlobj.conn;      
       	var callback = function(err, rowCount) {
		try {	   				
       		if (err) {
			   		clearBusy(sqlobj);
                  	util.log('carica5 '+conx.remotePort+': '+err);
				 	var nack = getMsg(5);
				 	conx.write(nack);	 	
				 	logga('carica5 '+conx.remotePort+': Errore su mSql_conn5\n'+err.toString()+'\n');			
                } 
				else {
					clearBusy(sqlobj);
                  	util.log(conx.remotePort+': '+rowCount + ' rows');
				  	logga("Inserito "+rowCount+' record\n');
				  	var ack = getMsg(1);
				  	conx.write(ack);
				  	var hangup = getMsg(6);
					conx.write(hangup);				  
				  	logga(conx.remotePort+': Ok insert su msQl_con5\n');
                }
			}
			catch(xcp) {
				util.log('sql Ok, conn5 remote socket caduto.');	
				logga('sql Ok, conn5 remote socket caduto.\n');
			}				
        };
		var request = new Request(qr,callback);
		setBusy(sqlobj);
       	csql.execSql(request);	   
}

var carica6 = function caricaRecord(qr,sqlobj,conx) { 
		var csql = sqlobj.conn;        
       	var callback = function(err, rowCount) {
		try {	   				
       		if (err) {
				  	clearBusy(sqlobj); 
                 	util.log('carica6 '+conx.remotePort+': '+err);
				 	var nack = getMsg(5);
				 	conx.write(nack);				 
				 	logga('carica6 '+conx.remotePort+': '+err.toString()+'\n');			
                } 
				else {
					clearBusy(sqlobj);
                  	util.log(conx.remotePort+': '+rowCount + ' rows');
				  	logga("Inserito "+rowCount+' record\n');
					var ack = getMsg(1);
				  	conx.write(ack);
				  	var hangup = getMsg(6);
				  	conx.write(hangup);
				    logga(conx.remotePort+': Ok insert su msQl_conn6\n');
                }
			}
			catch(xcp) {
				util.log('sql Ok, conn6 remote socket caduto.');	
				logga('sql Ok, conn6 remote socket caduto.\n');
			}						
        };
		var request = new Request(qr,callback);
		setBusy(sqlobj);
       	csql.execSql(request);	   
}

var carica7 = function caricaRecord(qr,sqlobj,conx) {  
		var csql = sqlobj.conn;   
       	var callback = function(err, rowCount) {	   	
		try {			
       			if (err) {
			   	 	clearBusy(sqlobj);
                 	util.log('carica7 '+conx.remotePort+': '+err);
				 	var nack = getMsg(5);
				 	conx.write(nack);				 
				 	logga('carica7 '+conx.remotePort+': '+err.toString()+'\n');			
                } 
				else {
					clearBusy(sqlobj);
                  	util.log(conx.remotePort+': '+rowCount + ' rows');
				  	logga("Inserito "+rowCount+' record\n');
				  	var ack = getMsg(1);
				  	conx.write(ack);
				  	var hangup = getMsg(6);
				  	conx.write(hangup);				  
				  	logga(conx.remotePort+': Ok insert su msQl_conn7\n');
                }
			}	
			catch(xcp) {
				util.log('sql Ok, conn7 remote socket caduto.');	
				logga('sql Ok, conn7 remote socket caduto.\n');
			}			
        };
		var request = new Request(qr,callback);
		setBusy(sqlobj);
       	csql.execSql(request);	   
}

var carica8 = function caricaRecord(qr,sqlobj,conx) { 
		var csql = sqlobj.conn;    
       	var callback = function(err, rowCount) {	  
		try { 				
       		 	if (err) {
			   		clearBusy(sqlobj);
                	util.log('carica8 '+conx.remotePort+': '+err);
					var nack = getMsg(5);
					conx.write(nack);
					logga('carica8 '+conx.remorePort+': '+err.toString()+'\n');			               
			 	} 
			 	else {
					clearBusy(sqlobj);
              		util.log(conx.remotePort+': '+rowCount + ' rows');
			  		logga("Inserito "+rowCount+' record\n');
			  		var ack = getMsg(1);
			  		conx.write(ack);
			  		var hangup = getMsg(6);
			  		conx.write(hangup);			  
			  		logga(conx.remotePort+': Ok insert su msQl_con8\n');
             	}
		 	}
		 	catch(xcp) {
				util.log('sql Ok, conn8 remote socket caduto.');	
				logga('sql Ok, conn8 remote socket caduto.\n');
			}	
							
        };
		var request = new Request(qr,callback);
		setBusy(sqlobj);
       	csql.execSql(request);	   
}

var carica9 = function caricaRecord(qr,sqlobj,conx) {
		var csql = sqlobj.conn;     
       	var callback = function(err, rowCount) {	
		try {   				
       		if (err) {
			   		clearBusy(sqlobj);
                 	util.log('carica9 '+conx.remotePort+': '+err);
				 	var nack = getMsg(5);
				 	conx.write(nack);
				 	logga('carica9 '+conx.remotePort+': '+err.toString()+'\n');			                
				} 
				else {
					clearBusy(sqlobj);
                  	util.log(conx.remotePort+': '+rowCount + ' rows');
				  	logga("Inserito "+rowCount+' record\n');
				  	var ack = getMsg(1);
				  	conx.write(ack);
				  	var hangup = getMsg(6);
				  	conx.write(hangup);		  
				  	logga(conx.remotePort+': Ok insert su msQl_con9\n');
                }
			}
			catch(xcp) {
				util.log('sql Ok, conn9 remote socket caduto.');	
				logga('sql Ok, conn9 remote socket caduto.\n');
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
			var tms = new Date().getTime();
			connessioni[count-1] = conn;
			conntms[count-1] = tms;
			for(var i=0;i<count;i++) {
				try {
					if(typeof connessioni[i].remotePort != 'undefined') {
						logga('Conn'+i+': '+connessioni[i].remotePort+'\n');
						util.log('Conn'+i+': '+connessioni[i].remotePort);
						// controlla conn timeout
						var now = new Date().getTime();
						//util.log('Conn'+i+': '+connessioni[i].remotePort+' attiva da '+(now-conntms[i])/1000+'sec.');
						//logga('Conn'+i+': '+connessioni[i].remotePort+' attiva da '+(now-conntms[i])/1000+'sec.\n');
						if((now-conntms[i])>15500) { // chiudile per timeout
							connessioni[i].destroy();
							logga('chiuso conn'+i+' per timeout 15.5 sec.\n');
							util.log('chiuso conn'+i+' per timeout 15.5 sec.');
							for(var j=i;j<count-1;j++) {
								connessioni[j] = connessioni[j+1];
								conntms[j] = conntms[j+1];
							}
							connessioni.splice(j,1);
							conntms.splice(j,1);
							util.log('tms last in array='+conntms[j-1]);
							count--;	
						}
					}
					else {
						logga('conn'+i+' undefined la elimino\n');
						util.log('conn'+i+' undefined la elimino');
						for(var j=i;j<count-1;j++) {
							connessioni[j] = connessioni[j+1];
							conntms[j] = conntms[j+1];
						}
						connessioni.splice(j,1);
						conntms.splice(j,1);
						count--;
					}
				 }
				 catch(excp) {
					 util.log('socket excpt, elimino conn'+i);
					 logga('socket excpt, elimino conn'+i+'\n');
					 for(var j=i;j<count-1;j++) {
							connessioni[j] = connessioni[j+1];
							conntms[j] = conntms[j+1];
					 }
					 connessioni.splice(j,1);
					 conntms.splice(j,1);
					 count--;
				 }
			}
			util.log("Current active connections count: "+count);
			logga("Current active connections count: "+count+'\n');
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
		logga(err+'\n');
		util.log(err);
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
		var hbsn;
		var rtchb;
		var qr = "INSERT into ";
		var starts = 3; // inizio dati in dats string
		if(tipCall == 4) { // chiamata di allarme
			qr += 'alarm (boxId,rtc,sensSn) values(';	
			hbsn = dats.substring(starts,starts+7);  // 7 char ascci hb S/n
			qr += hbsn+',';
			starts += 8; // salto tipo conn (alive o alarm)
			rtchb = dats.substring(starts,starts+7); // rtc homebox
			qr += "'"+getRtcDate(rtchb)+"',";
			starts += 7;
			qr += dats.substring(starts,starts+7)+');'	 // Sn sensore in allarme
			logga('conn'+conndx+' qr= '+qr+'\n');
		} 
		else if(tipCall == 3) {	
			var qrhead;
			qr += 'alive (boxId,rtc,tipal,aas,pwfth,fail_datetime,durata,';
			qr += 'tipsens,sensSn,carbatt,datetest,datecomm) values(';
			hbsn = dats.substring(starts,starts+7);  // 7 char ascci hb S/n
			qr += hbsn+',';
			qrhead = hbsn+',';
			starts += 8; // salto tipo conn (alive o alarm)
			rtchb = dats.substring(starts,starts+8); // rtc homebox
			qr += "'"+getRtcDate(rtchb)+"',";
			qrhead += "'"+getRtcDate(rtchb)+"',";
			starts += 7; // 
			qr += dats.substring(starts,starts+1).charCodeAt(0)+','; // tipal
			qrhead +=  dats.substring(starts,starts+1).charCodeAt(0)+',';
			starts++;
			qr += dats.substring(starts,starts+1).charCodeAt(0)+','; // aas
			qrhead += dats.substring(starts,starts+1).charCodeAt(0)+',';
			starts++;
			qr += dats.substring(starts,starts+1).charCodeAt(0)+','; // pwfth
			qrhead += dats.substring(starts,starts+1).charCodeAt(0)+',';			
			starts++;
			rtchb = dats.substring(starts,starts+7)+','; // fail_dateteime
			qr += "'"+getRtcDate(rtchb)+"',";
			qrhead += "'"+getRtcDate(rtchb)+"',";
			starts += 8; //salto ; prima di durata
			var dura = dats.substring(starts,starts+2);
			qr += (dura.charCodeAt(0)*16+dura.charCodeAt(1))+','; // durata
			qrhead += (dura.charCodeAt(0)*16+dura.charCodeAt(1))+',';
			starts += 2;
			// questa sequenza può essere ripetuta i8n funzione della
			// presenza di più sensori. Minumo 2: 1 acqua + 1 fumo
			var tipsens = dats.substring(starts,starts+2);	// tipsens
			qr += (tipsens.charCodeAt(0)*16+tipsens.charCodeAt(1))+',';
			starts += 2;
			qr += dats.substring(starts,starts+7)+','; // sensSn
			//util.log('Sn='+dats.substring(starts,starts+7));
			starts += 7;
			qr += dats.substring(starts,starts+1).charCodeAt(0)+','; // carbatt
			starts++;
			rtchb = dats.substring(starts,starts+7); // datetest
			qr += "'"+getRtcDate(rtchb)+"',";
			starts +=7;
			rtchb = dats.substring(starts,starts+7); // datecomm
			qr += "'"+getRtcDate(rtchb)+"')";
			starts += 7;
			while((starts+2) < dats.length) {
				qr += ',('+qrhead;
				tipsens = dats.substring(starts,starts+2);	// tipsens
				qr += (tipsens.charCodeAt(0)*16+tipsens.charCodeAt(1))+',';
				starts += 2;
				qr += dats.substring(starts,starts+7)+','; // sensSn
				starts += 7;
				qr += dats.substring(starts,starts+1).charCodeAt(0)+','; // carbatt
				starts++;
				rtchb = dats.substring(starts,starts+7); // datetest
				qr += "'"+getRtcDate(rtchb)+"',";
				starts +=7;
				rtchb = dats.substring(starts,starts+7); // datecomm
				qr += "'"+getRtcDate(rtchb)+"')";
				starts += 7;	
			}
			logga('conn'+conndx+' qr= '+qr+'\n');
		}
		// cerca prima connSql libera
		// csql.conn = connection;
		// csql.busy = false;
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
		return true;
	}
	
	conn.on('close', function() {
		
		util.log('client '+conn._peername.address+' '+conn._peername.port+' closed conn');
		logga('conn port: '+conn._peername.port+' ha chiuso conn.\n');
		
		var closing = [];
		var i=0;
		
		connessioni.forEach(function() {
			//util.log('conn'+i+': '+connessioni[i].remotePort);
			try {
				if(typeof connessioni[i].remotePort == 'undefined') {
					closing.push(i);
				}
				else {
					logga('conn'+i+' port '+connessioni[i].remotePort+' attiva\n');
					util.log('conn'+i+' port '+connessioni[i].remotePort+' attiva');
					i++;
				}
			}
			catch(excp) { // connessioni[i] caduta quindi undefined
						  // tratto la cosa come remotePort undefined	
				closing.push(i);
			}
		});
		
		for(var j=0;j<closing.length;j++) {
			
			if(closing[j] == connessioni.length-1) {
				connessioni.splice(closing[j],1);
				conndata.splice(closing[j] ,1);	
				util.log("Elimino i="+closing[j]+" in array connessioni");
				logga("Elimino i="+closing[j]+' in array connessioni: '+conn._peername.port+'\n');
			}
			else {
					for(i=closing[j];i<connessioni.length-1;i++) {
						connessioni[i] = connessioni[i+1];
						conndata[i] = conndata[i+1];
					}
					connessioni.splice(i,1);
					conndata.splice(i,1);	
			}
			util.log("Connessioni ora attive: "+connessioni.length);
			logga("Connessioni ora attive: "+connessioni.length+'\n');
			logga(callerID[closing[j]]+': client '+conn._peername.address+' '+conn._peername.port+' chiuso conn.\n');
		}
		/**
		else {
			util.log("ERRORE: cliente da chiudere NON trovato!");
			logga("ERRORE: cliente da chiudere NON trovato!\n");
		}
		**/
	});
}).listen(port);
console.log('listening on port '+port);