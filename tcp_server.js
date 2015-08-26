var net = require('net');
var util = require('util');
var fs = require('fs');
var moment = require("moment");
var writeStream = fs.createWriteStream('./ricevuto.log',
	{'flags' : 'a',
	 'encoding' : 'utf8',
	 'mode' : 0x1b6});

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

var logga = function(log) { 
				var now = moment(new Date());
				writeStream.write(now.format("DD MMM YYYY HH:MM:ss.SSS")+' '+log,'utf8',function(err) {
					if(err) throw err;
				});
		    }
		    
var server = net.createServer(function(conn) {
	
	cliente = {};
	cliente.ip   = conn.remoteAddress;
	cliente.port = conn.remotePort;
	connessioni.push(conn);
	util.log('connected: '+ cliente.ip+' '+cliente.port);
	logga('connected: '+ cliente.ip+' '+cliente.port+'\n');
	
	//console.log(connessioni[connessioni.length-1]);
	//util.log(util.inspect(conn, true, null, true));
	server.getConnections(function(err,count) {
		if(err) throw err;
		console.log("Current active connections count: "+count);
	})
	
	conn.on('data', function (data) {
		var		now = new Date();
		console.log(now.toString()+' '+data + ' from ' + 
			conn.remoteAddress + ' ' +
			conn.remotePort);
		
		var i=0;
		connessioni.forEach(function() {
			if(connessioni[i] == conn)
				return;
			else
				i++;
		});
		if (typeof conndata[i] == "undefined") {
			conndata[i] = ""
		}
		else conndata[i] += data;
		//util.log(util.inspect(conn, true, null, true));
		
		if(data.length > 3) {
			if(data[data.length-2] == 4 && data[data.length-1] == 4) {
				util.log("Bytes ricevuti "+conn._handle.onread.arguments['2']+" : "+conndata[i]);
				logga('Bytes ricevuti '+conndata[i].length+' : '+conndata[i]+'\n');
				conn.write('ack');
				conndata.splice(i,1);
			}
			else {
				insertData(conndata[i]);
				conn.write('ack\n');
				console.log('risposto a client');
			}
		}
	});
	
	function insertData(dats) {
		var righe = dats.split('\n');
		var row;
		var qr = "INSERT into plots values(";
		righe.forEach(riga) {
			row = riga.split(';');	
			for(var i=0;i<row.length-1;i++) {
				qr += row[i]+',';	
			}
			qr += row[i]+'),(';
		}
		qr = qr.substr(0,qr.length-2);
		console.log(qr);
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
}).listen(8124);
console.log('listening on port 8124');