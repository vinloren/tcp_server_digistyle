# tcp_server_digistyle
JS tcp_server per servire raccolta dati da parte di client che li inviano secondo un protocollo TCP socket
con un formato record tale da permettere al server di inserire i dati in un uSoft SQL Server poi accessibile
per consultazioni e statistiche. Il modulo usato per accesso a mSql Server è 'tedious.js'.

Obiettivo del server è quello di servire un numero di client collegati in contemporanea, pari a diverse decine,  
tutti per caricare dati omogenei nella stessa tabella mSql. Qui nasce il primo problema ovvero se sia opportuno 
gestire il tutto con un'unica connessione al DB oppure con una connessione per ciascun client al momento in
sessione.

Soluzione con una singola connessione a DB mSql
-----------------------------------------------
Una via d'uscita sarebbe quella di accodare le richieste ricevute in un array che poi viene scaricato 
(le ralative insert accumulate eseguite sequenzialmente in modo asincrono rispetto alle richieste ricevute) 
periodicamente via setTimeout con cadenza di 500mS (ad esempio). Questa soluzione però non sarebbe in grado di 
informare contestualmente il client sull'esito della sua richiesta (verrebbe risposto 'ack' subito ad ogni 
ricezione) il che non mi pare una bella trovata. La soluzione adottata in questa applicazione è quindi quella 
di attribuire una propria connessione mSql a ciascuna connessione TCP aperta.

Soluzione con una conn mSql per ciascuna conn Tcp:
--------------------------------------------------
Utilizzare un'unica connessione mSql crea problemi di sincronizzazione delle richieste di insert che non
possono essere inviate se non quando il server mSql ha la connessione libera da esecuzione di statements 
precedenti. Data la natura asincrona di node.js, risulterebbe molto macchinoso sincronizzare funzioni 
asincrone nella connessione TCP con funzioni asincrone nella connessione mSql server.

Ecco allora che risulta più agevole attribuire una connessione mSql a ciascuna connessione TCP attiva e poi 
fare in modo che il server possa notificare con 'ack' l'avvenuta insert al client che l'aveva richiesta. 

Prevediamo allora il massimo numero di connessioni concorrenti e apriamo una conn_mSql per ciascuna 
di esse. Data la natura asincrona di node.js può capitare all'avvio di tcp_server.js che le n connessioni
previste col DB non siano ancora state attivate mentre arriva una ennesima cnnessione TCP di numero maggiore
della massima conn_mSql attivata. In questo caso, come pure nel caso di ennesima connessione TCP > del max
numero previsto, tcp_server.js risponde con 'DB non pronto, riprova\r\n' chiudendo subito il tcp socket 
relativo:
	if(connessioni.length+1 > connSql.length) {
		conn.write('DB non pronto, riprova\r\n');
		conn.close();
		return;
	}
Se invece la conn TCP trova una corrispondente conn_mSql attivata allora la risposta al client sarà:
conn.write('Ready\r\n'); e il client potrà inoltrare il primo invio dati. La connessione mSql viene associata
alla connessione Tcp richiedente in modo dinamico ovvero viene presa la prima conn mSql libera dall'array
che le contiene tutte. L'array contiene MAXCONN oggetti dove obj.conn è la conn mSql, obj.busy è un boolean 
false per conn libera, true per occupata.

La scelta della specifica funzione di inserimento dati, che contiene anche la callback di riscontro fine 
inserimento o errore, è creata dinamicamnete di volta in volta tramite eval() che traduce la stringa di 
codice esecutivo, creato per ciascuna conn Tcp di MAXCONN, posto in array carica[]: 
for (var i=0;i<MAXCONN;i++) {
	carica[i] = " (qr,sqlobj,conx) { "+
		"var csql = sqlobj.conn;"+
       	"var callback = function(err, rowCount) { "+
		"try { "+				
       	"	if (err) { "+
				"   clearBusy(sqlobj); "+
                " 	util.log(conx.remotePort+': '+err); "+
				" 	var nack = getMsg(5); "+
				" 	conx.write(nack); "+	
				" 	logga(conx.remoteport+\": \"+err.toString()+\"\\n\"); } "+
				"else { "+
				"	clearBusy(sqlobj); "+
                "  	util.log(conx.remotePort+': '+ rowCount + ' rows');"+
				"   logga('Inserito '+ rowCount + \' record\'"+"+'\\n');"+
				"   var ack = getMsg(1); "+
				"  	conx.write(ack); "+
				"  	var hangup = getMsg(6); "+
				"  	conx.write(hangup); "+
				"  	logga(conx.remotePort+\": Ok insert su msQl_con"+i+"\\n\"); }"+				
        "	}	catch(xcp) {"+
			"	util.log(\"sql Ok, conn"+i+"\" +\" remote socket caduto.\");"+	
			"	logga(\"sql Ok, conn"+i+"\"+\" remote socket caduto.\\n\");"+"}"+
	"	}; "+
	"	var request = new Request(qr,callback); "+
	"	setBusy(sqlobj); "+
    "  	csql.execSql(request);}"
}

Al momento della richiesta di inserimento dati in DB mSql Server viene crata dinamicamente l'opportuna 
funzione di controllo:

eval("function load "+carica[conndx]);
load(qr,connSql[i],connessioni[conndx]);

Dove qr è la query di insert, connSql[i] è la prima connSql trovata libera, conndx è l'indice della
connessione Tcp al momento in corso richiedente l'inserimento dati.


PROTOCOLLO SCAMBIO DATI CLIENT/SERVER
-------------------------------------

Formato record (lunghezza variabile):
1 char STX (0x02)
2 char MSGLEN (Hex)
7 char ID HOME BOX (ASCII numerico = Serial number della HBox chiamante)
1 INFO_TYPE: <-> ACK: 0x01, NACK: 0x05, <- ALIVE: 0x03, ALARM: 0x04, CALL: 0x05, ->HANGUP: 0x06, PAR: 0x07
x MSG  ASCII lunghezza variabile campi separati da ; e '\n' a chiusura messaggio
1 char CRC (Hex)  XOR su tutti i byte del campo INFO_TYPE+MSG. Codificato come il campo MSGLEN.
1 char ETX (0x03)

Protocollo:
il server risponde a ciascuna richiesta con Ack o Nack. A seguito di Nack il cliente chiude la connessione, in 
caso di Ack rimane in attesa di HANGUP da parte del server, ricevuto HANGUP chiude connessione.

POSSIBILE CONTENUTO MSG:
(alarm) boxId;rtc;sensSn
(alive) boxId,rtc,tipal,aas,pwfth,fail_datetime,durata,
		tipsens,sensSn,carbatt,datetest,datecomm

