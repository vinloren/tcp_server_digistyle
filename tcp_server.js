var net = require('net');
var util = require('util');
var process = require('process');
var Buffer = require('Buffer');
var fs = require('fs');
var moment = require("moment");
var ofset = 0;
var logIndex;
try {
	 logIndex = fs.openSync('./logIndex.log','r+',0x1b6); 	// puntatore posizione in log file
}
catch(exc) {
	logIndex = fs.openSync('./logIndex.log','w',0x1b6);
	fs.closeSync(logIndex);
	logIndex = fs.openSync('./logIndex.log','r+',0x1b6); 
}
var writeStream = fs.openSync('./tcpserver.log','a',0x1b6);
	
var carica = [];
var connSql = [];
var connessioni = [];
var conntms = [];	// timestamp apertura conn
var conndata = [];
var callerID = [];
var cliente = {};
var Connection = require('tedious').Connection;
var Request = require('tedious').Request;
var connection;
var conndx = 0;
var MAXCONN = 10;
var c = 0;
var maxLog = 1000000; // maxLog = 1Mb
var LOG = '1';
var arrcs = new Array();
var qrarr = new Array();
var config = {
        userName: 'sa',
        domainName: "localhost.localdomain",
        password: 'scdvbisa',
        server: 'localhost',
        options: {
            port: '1433',
            database: 'trips'
        }
    };

var port = '8124';
process.argv.forEach(function (val, index, array) {
	switch(index) {
		case 2:
			port = val;
			console.log(index + ' port: ' + val);
			break;
		case 3:
			MAXCONN = parseInt(val);
			console.log(index + ' MAXCONN: ' + val);
			break;
		case 4:
			LOG = val;
			console.log(index + ' LOG: ' + val);
			break;
	}
});	

var stats = fs.fstatSync(logIndex);
if(stats.size > 0) {
	var buf = new Buffer(8,'utf8');
	fs.readSync(logIndex,buf,0,buf.length,0);
	ofset = parseInt(buf.toString());
	if(ofset > maxLog) {
		ofset = 0;
	}
	buf = new Buffer(ofset.toString(),'utf8');
	fs.write(logIndex,buf,0,buf.length,0, function(err) {
			util.log('Inizio log at '+ofset);
			if(err) throw err;
	});
} 
else {
		buf = new Buffer(ofset.toString(),'utf8');
		fs.write(logIndex,buf,0,buf.length,0, function(err) {
			util.log('Inizio log at 0');
			if(err) throw err;
		});
}


var logga = function(log) { 
				var now = moment(new Date());
				var dati = now.format("DD/MM/YYYY HH:mm:ss.SSS")+' '+log;
				var buf = new Buffer(dati,'utf8');
				
				fs.write(writeStream,buf,0,buf.length,ofset, function(err) {
					if(err) throw err;
					ofset += buf.toString('utf8').length;
					if(ofset > maxLog) {
						ofset = 0;
					}
					buf = new Buffer(ofset.toString(),'utf8');
					fs.write(logIndex,buf,0,buf.length,0, function(err) { // salva log pointer
						if(err) throw err;
					});
				});
				
		    }
			

// crea pool di MAXCONN connessioni a DB da usare  
// per future connessioni TCP
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

for (var i=0;i<MAXCONN;i++) {
	carica[i] = " (qr,sqlobj,conx) { "+
		"var csql = sqlobj.conn;"+
       	"var callback = function(err, rowCount) { "+
		"try { "+				
       	"	if (err) { "+
				"   clearBusy(sqlobj); "+
                " 	util.log(conx.remotePort+': '+err); "+
				" 	conx.write(\'nack\\r\\n\'); "+	
				" 	logga(conx.remoteport+\": \"+err.toString()+\"\\n\"); } "+
				"else { "+
				"	clearBusy(sqlobj); "+
                "  	util.log(conx.remotePort+': '+ rowCount + ' rows');"+
				"   logga('Inserito '+ rowCount + \' record\'"+"+'\\n');"+
				"  	conx.write(\'ack\\r\\n\'); "+
				"  	logga(conx.remotePort+\": Ok insert su msQl_con"+i+"\\n\"); }"+				
        "	}	catch(xcp) {"+
			"	util.log(\"sql Ok, conn"+i+"\" +\" remote socket caduto.\");"+	
			"	logga(\"sql Ok, conn"+i+"\"+\" remote socket caduto.\\n\");"+"}"+
	"	}; "+
	"	var request = new Request(qr,callback); "+
	"	setBusy(sqlobj); "+
    "  	csql.execSql(request);}"
}


function caricaRecord(qr,conndx) {   
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
		
		util.log('carico'+conndx); 
		eval("function load "+carica[conndx]);
		load(qr,connSql[i],connessioni[conndx]);
		
		return true;   
}

    
var server = net.createServer(function(conn) {
	
	cliente = {};
	cliente.ip   = conn.remoteAddress;
	cliente.port = conn.remotePort;
	
	if(connessioni.length+1 > connSql.length) {
		logga('Conn DB non pronta per conn'+connessioni.length+'\n');
		util.log('Conn DB non pronta per conn'+connessioni.length);
		conn.end('nack\r\n'); // send nack
		return;
	}
	
	if(connessioni.length > MAXCONN) {
		logga('MAXCONN raggiunto chiudo socket.\n');
		util.log('MAXCONN raggiunto chiudo socket.');
		conn.end('nack\r\n'); // send nack
		connessioni.slice(connessioni.length-1,1);
		return;
	}
	
	util.log('connected: '+ cliente.ip+' '+cliente.port);
	logga('connected: '+ cliente.ip+' '+cliente.port+'\n');
	conn.write('Ready\r\n');
	
	var tms = new Date().getTime();
	connessioni.push(conn);
	conntms[connessioni.length-1] = tms;
	callerID[connessioni.length-1] = cliente.port;
	var top = connessioni.length;
	var i = 0;
	while(i<top) {
		try {
			logga('conn'+i+': '+connessioni[i].remotePort+'\n');
			util.log('Conn'+i+': '+connessioni[i].remotePort);
			// controlla conn timeout
			var now = new Date().getTime();
			//util.log('Conn'+i+': '+connessioni[i].remotePort+' attiva da '+(now-conntms[i])/1000+'sec.');
			//logga('Conn'+i+': '+connessioni[i].remotePort+' attiva da '+(now-conntms[i])/1000+'sec.\n');
			if((now-conntms[i])>20000) { // chiudile per timeout	
				logga(callerID[i]+' chiuso conn'+i+' per timeout 20 sec.\n');
				util.log(callerID[i]+' chiuso conn'+i+' per timeout 20 sec.');
				connessioni[i].destroy();
				connessioni.splice(i,1);
				conntms.splice(i,1);
				callerID.splice(i,1);
				top--;
			}
			else {
				i++;
			}
		}
		catch(excp) {
			logga('conn'+i+': '+callerID[i]+' connessione caduta\n');
			util.log('Conn'+i+': '+callerID[i]+' connessione caduta');
			connessioni.splice(i,1);
			conntms.splice(i,1);
			callerID.splice(i,1);
			top--;
		}	
	}
	
	util.log("(on conn) Connessioni ora attive: "+connessioni.length);
	logga("(on conn) Connessioni ora attive: "+connessioni.length+'\n');
	
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
		var now = moment(new Date());
		now = now.format("DD/MM/YY HH:mm:ss.SSS");
		
		if(LOG == '1') {
			var cli = conn.remoteAddress + ' ' +
					  conn.remotePort;
			util.log(now+' '+data + ' from ' + cli);
			logga('Ricevuto da '+cli+': len='+data.length+' '+ToHex(data)+'\n');
		}
		
		var i=0;
		connessioni.forEach(function() {
			if(connessioni[i] == conn) {
				conndx = i;
				return;
			}
			else
				i++;
		});
		
		var datas = data.toString();
		datas = datas.replace('\r','');
		datas = datas.replace('\n','');
		if (typeof conndata[i] == "undefined") {
			conndata[i] = ""
		}
		conndata[i] += datas;
		
		
		// gestione ascii standard
		if(LOG == '1') {
			logga('conndata['+i+'] = '+conndata[i]+'\n');	
		}
		
		if(conndata[i] == '') {
			conn.write('Ready\r\n');
			logga(callerID[i]+': Ready\n');
			return;
		}
			
		if(insertData(conndata[i])) {
				conndata[i] = '';			
		}
		else {
				conn.write('nack\r\n');
				util.log(callerID[i]+': Risposto nack a client');
				logga(callerID[i]+': Risposto nack a client\n');
		}
	});
	
	function insertData(dats) {
		var righe = dats.split('&');
		var row;
		var qr = "INSERT into plots values(";
		for(var j=0;j<righe.length;j++) {
			row = righe[j].split(';');
			if(row.length<5 && j==0) {	
				logga(callerID[conndx]+' Rigetto insert causa riga incompleta: solo '+row.length
					+' campi= '+ToHex(new Buffer(righe[j],'utf8'))+'\n');
				return false;
			}
			else if(j>0 && row.length < 6) {
				if(row.length > 1) {
					logga(callerID[conndx]+': qr='+qr+'\nRigetto insert causa riga incompleta: solo '+row.length
					+' campi= '+ToHex(new Buffer(righe[j],'utf8'))+'\n');
					return false;
				}
				else {
					row[0] = '';
				}
			}
			for(var p=0;p<row.length-1;p++) {
				qr += row[p]+',';	
			}
			qr += row[p]+'),(';
		}
		
		qr = qr.substr(0,qr.length-2);
		if(LOG == '1') {
			util.log(callerID[conndx]+': qr= '+qr);
			logga(callerID[conndx]+': qr= '+qr+'\n');
		}
		caricaRecord(qr,conndx);
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
		
		var j = closing.length;
		while(j > -1) {		
				connessioni.splice(closing[j],1);
				conndata.splice(closing[j] ,1);	
				conntms.splice(closing[j],1);
				logga(callerID[closing[j]]+': chiuso conn.\n');
				util.log(callerID[closing[j]]+': chiuso conn.');
				callerID.splice(closing[j],1);
				j--;	
		}
			
		util.log("(on close) Connessioni ora attive: "+connessioni.length);
		logga("(on close) Connessioni ora attive: "+connessioni.length+'\n');	
		
	});
}).listen(port);
console.log('listening on port '+port);