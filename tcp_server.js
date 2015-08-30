var net = require('net');
var util = require('util');
var fs = require('fs');
var moment = require("moment");
var writeStream = fs.createWriteStream('./tcpserver.log',
	{'flags' : 'a',
	 'encoding' : 'utf8',
	 'mode' : 0x1b6});

var connSql = [];
var connessioni = [];
var conndata = [];
var cliente = {};
var Connection = require('tedious').Connection;
var Request = require('tedious').Request;
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
	}
});	

var logga = function(log) { 
				var now = moment(new Date());
				writeStream.write(now.format("DD MMM YYYY HH:MM:ss.SSS")+' '+log,'utf8',function(err) {
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
        	console.log('got an error %s',err);
			logga('Errore mSQL: '+err.toString()+'\n');
		}
    	else {
			connSql.push(connection);
        	console.log('DB connesso per conn'+c);
			logga('DB connesso per conn'+c+'\n');
			c++;
			if(c < MAXCONN) {
				getConn();
			}
		}
    });	
}

getConn();

function caricaRecord(qr,cndx) {
        
       	var callback = function(err, rowCount) {
		   				
                        if (err) {
                            console.log(err);
							logga(err.toString()+'\n');
							connessioni[cndx].write('nack\r\n');
							logga('Errore su mSql_conn '+cndx+'\n');
							
                        } else {
                            console.log(rowCount + ' rows');
							logga("Inserito "+rowCount+' record\n');
							connessioni[cndx].write('ack\r\n');
							logga('Ok insert su msQl_con'+cndx+'\n');
                        }
						
                    };
		
		var request = new Request(qr,callback);
       	connSql[cndx].execSql(request);	   
}


			
		    
var server = net.createServer(function(conn) {
	
	cliente = {};
	cliente.ip   = conn.remoteAddress;
	cliente.port = conn.remotePort;
	
	if(connessioni.length+1 > connSql.length) {
		conn.write('DB non pronto, riprova\r\n');
		conn.close();
		return;
	}
	
	connessioni.push(conn);
	
	util.log('connected: '+ cliente.ip+' '+cliente.port);
	logga('connected: '+ cliente.ip+' '+cliente.port+'\n');
	
	//console.log(connessioni[connessioni.length-1]);
	//util.log(util.inspect(conn, true, null, true));
	server.getConnections(function(err,count) {
		if(err) {
			logga(err.toString()+'\n');
			console.log(err.toString()+'\n');
		}
		else {
			console.log("Current active connections count: "+count);
			logga("Current active connections count: "+count+'\n');
			conn.write('Ready\r\n');
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
	
	conn.on('error', function (err) {
		logga(err.toString()+'\n');
		console.log(err.toString()+'\n');	
	});
	
	conn.on('data', function (data) {
		var now = moment(new Date());
		now = now.format("DD MMM YYYY HH:MM:ss.SSS");
		
		console.log(now+' '+data + ' from ' + 
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
		
		var datas = data.toString();
		datas = datas.replace('\r','');
		datas = datas.replace('\n','');
		if (typeof conndata[i] == "undefined") {
			conndata[i] = ""
		}
		conndata[i] += datas;
		
		// se pacchetti gestiti da fine record = EOT EOT
		if(conndata[i].length > 3) {
			if(data[data.length-2] == 4 && data[data.length-1] == 4) {
				util.log("Bytes ricevuti "+conn._handle.onread.arguments['2']+" : "+conndata[i]);
				logga('Bytes ricevuti '+conndata[i].length+' : '+conndata[i]+'\n');
				conn.write('ack');
				conndata.splice(i,1);
				return;
			}
		}
		// gestione ascii standard
		logga('conndata['+i+'] = '+conndata[i]+'\n');
		if(conndata[i] == '') {
			conn.write('Ready\r\n');
			logga('Ready\n');
			return;
		}
			
		if(insertData(conndata[i])) {
				conndata[i] = '';			
		}
		else {
				conn.write('nack\r\n');
				console.log('risposto nack a client');
				logga('Risposto nack a client\n');
		}
	});
	
	function insertData(dats) {
		var righe = dats.split('&');
		var row;
		var qr = "INSERT into plots values(";
		for(var j=0;j<righe.length;j++) {
			row = righe[j].split(';');
			if(row.length<5 && j==0) {	
				logga('Rigetto insert causa riga incompleta: solo '+row.length
					+' campi= '+ToHex(new Buffer(righe[j],'utf8'))+'\n');
				return false;
			}
			else if(j>0 && row.length < 6) {
				if(row.length > 1) {
					logga('qr='+qr+'\nRigetto insert causa riga incompleta: solo '+row.length
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
		console.log('qr= '+qr);
		logga('qr= '+qr+'\n');
		caricaRecord(qr,conndx);
		return true;
	}
	
	conn.on('close', function() {
		util.log('client '+conn._peername.address+' '+conn._peername.port+' closed conn');
		//console.log(connessioni[connessioni.length-1]);
		var i=0;
		connessioni.forEach(function() {
			if(connessioni[i] == conn)
				return;
			else
				i++;
		});
		
		if(i<connessioni.length) {
			//console.log("Elimino i="+i+" in array connessioni");
			connessioni.splice(i,1);
			conndata.splice(i,1);		
			console.log("Connessioni attive in array: "+connessioni.length);
			logga('client '+conn._peername.address+' '+conn._peername.port+' chiuso conn; ne restano attive '+connessioni.length+'\n');
		}
		else {
			console.log("ERRORE: cliente da chiudere NON trovato!");
			logga("ERRORE: cliente da chiudere NON trovato!\n");
		}
		server.getConnections(function(err,count) {
			if(err) throw err;
			util.log("Current active connections count: "+count);
		})	
	});
}).listen(port);
console.log('listening on port '+port);