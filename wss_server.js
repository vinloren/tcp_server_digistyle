var util = require('util');
var uuid = require('node-uuid');
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
var writeStream;
try {
 	writeStream = fs.openSync('./wsserver.log','r+',0x1b6);
}
catch(ex) {	
	writeStream = fs.openSync('./wsserver.log','w',0x1b6);
	fs.closeSync(writeStream);
	writeStream = fs.openSync('./wsserver.log','r+',0x1b6);
}
var carica = [];
var connSql = [];
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

var PORT = '8124';
process.argv.forEach(function (val, index, array) {
	switch(index) {
		case 2:
			PORT= val;
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

var loglock = false;
var righe = [];
var logga = function(log) { 
				var now = moment(new Date());
				var dati = now.format("DD/MM/YYYY HH:mm:ss.SSS")+' '+log;
				var buf = new Buffer(dati,'utf8');
				righe.push(buf);
				var callback = function(err) {
						if(err) throw err;
					
						buf = new Buffer(ofset.toString(),'utf8');
						fs.write(logIndex,buf,0,buf.length,0, function(err) { // salva log pointer
							if(err) throw err;
						});
						ofset += righe[0].length;
						if(ofset > maxLog) {
							ofset = 0;
						}
						righe.splice(0,1);
						if(righe.length > 0) {
							fs.write(writeStream,righe[0],0,righe[0].length,ofset,callback);
						}
						else {
							loglock = false;
						}
				};
				
				if(!loglock) {
					fs.write(writeStream,righe[0],0,righe[0].length,ofset,callback); 
					loglock = true;	
				}
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
		"var conid = conx.id;"+
       	"var callback = function(err, rowCount) { "+
		"try { "+				
       	"	if (err) { "+
				"   clearBusy(sqlobj); "+
                " 	util.log(conx.remotePort+': '+err); "+
				" 	conx.ws.send(\'nack\'); "+	
				" 	logga(conid+\": \"+err.toString()+\"\\n\"); } "+
				"else { "+
				"	clearBusy(sqlobj); "+
                "  	util.log(conid+': '+ rowCount + ' rows');"+
				"   logga(conid+': Inserito '+ rowCount + \' record\'"+"+'\\n');"+
				"  	conx.ws.send(\'ack\'); "+
				"  	logga(conid+\" Ok insert su msQl_con"+i+"\\n\"); }"+				
        "	}	catch(xcp) {"+
			"	util.log(conid+\" sql Ok, remote socket caduto.\");"+	
			"	logga(conid+\" sql Ok, remote socket caduto.\\n\");"+"}"+
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
		load(qr,connSql[i],clients[conndx]);
		
		return true;   
}

var porta = {};
porta.port = PORT;
var WebSocketServer = require('ws').Server, 
wss = new WebSocketServer(porta);
util.log("Server in ascolto su port "+PORT);
var clients = [];

wss.on('connection',function(ws) {
	var client_uuid = uuid.v4();
	util.log('Connesso client: '+client_uuid);
	clients.push({"id":client_uuid, "ws":ws});
	util.log("Client connessi: "+clients.length);
	ws.send('ack');
	util.log('ack -> '+client_uuid);
	
	ws.on('message',function(message) {
		// cerca ID 
		for(var i=0;i<clients.length;i++) {
			if(ws == clients[i].ws) {
				break;
			}
		}
		util.log("Rcv da "+clients[i].id+": "+message);
		
		try {
			var num = parseInt(message.substring(0,10));	
		}
		catch(err) {
			util.log("record non valido, rispondo nack");
			ws.send('nack');
			return;
		}
		
		if(!insertData(message,i)) {
			ws.send('nack');
			util.log(clients[i].id+" Risposto nack a client causa errore formato record");
			logga(clients[i].id+': Risposto nack a client causa errore formato record\n');
		}
		
		//ws.send('ack');
	});
	
	ws.on('close', function() {
		for(var i=0;i<clients.length;i++) {
			if(ws == clients[i].ws) {
				break;
			}
		}
		util.log(clients[i].id+": Chiuso connessione");	
		clients.splice(i,1);
	});
	
	ws.on('error', function(e) {
		for(var i=0;i<clients.length;i++) {
			if(ws == clients[i].ws) {
				break;
			}
		}
		util.log(clients[i].id+" errore: "+e.data);	
		clients.splice(i,1);	
	});
	
});

function insertData(dats,conndx) {
		var righe = dats.split('&');
		var row;
		var qr = "INSERT into plots values(";
		for(var j=0;j<righe.length;j++) {
			row = righe[j].split(';');
			if(row.length<6 && j==0) {	
				logga(callerID[conndx]+' Rigetto insert causa riga incompleta: solo '+row.length
					+' campi= '+righe[j]+'\n');
				return false;
			}
			else if(j>0 && row.length < 6) {
				if(row.length > 1) {
					logga(callerID[conndx]+': qr='+qr+'\nRigetto insert causa riga incompleta: solo '+row.length
					+' campi= '+righe[j]+'\n');
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
			util.log(clients[conndx].id+': qr= '+qr);
			logga(clients[conndx].id+': qr= '+qr+'\n');
		}
		caricaRecord(qr,conndx);
		return true;
	}
