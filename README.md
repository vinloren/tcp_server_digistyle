# tcp_server_digistyle
JS tcp_server per servire raccolta dati da parte di client che li inviano secondo un protocollo TCP socket
con un formato record tale da permettere al server di inserire i dati in un uSoft SQL Server poi accessibile
per consultazioni e statistiche. Il modulo usato per accesso a mSql Server è 'tedious.js'.

Obiettivo del server è quello di servire un numero di client collegati in contemporanea, pari a diverse decine,  
tutti per caricare dati omogenei nella stessa tabella mSql. Qui nasce il primo problema ovvero se sia opportuno 
gestire il tutto con un'unica connessione al DB oppure con una connessione per ciascun client al momento in
sessione.

Soluzione con una conn mSql per ciascuna conn Tcp:
--------------------------------------------------
Utilizzare un'unica connessione mSql crea problemi di sincronizzazione delle richieste di insert che non
possono essere inviate se non quando il server mSql ha la connessione libera da esecuzione di statements 
precedenti. Data la natura asincrona di node.js, risulterebbe molto macchinoso sincronizzare funzioni 
asincrone nella connessione TCP con funzioni asincrone nella connessione mSql server.

Ecco allora che risulta più agevole attribuire una connessione mSql a ciascuna connessione TCP attiva e poi 
fare in modo che il server possa notificare con 'ack' l'avvenuta insert al client che l'aveva richiesta. 

Prevediamo allora il massimo numero di connessioni concorrenti e apriamo una conn_mSql per ciascuna di esse. 
Data la natura asincrona di node.js può capitare all'avvio di tcp_server.js che le n connessioni previste 
col DB non siano ancora state attivate mentre arriva una ennesima cnnessione TCP di numero maggiore della 
massima conn_mSql attivata. In questo caso, come pure nel caso di ennesima connessione TCP > del max numero 
previsto, tcp_server.js risponde con 'DB non pronto, riprova\r\n' chiudendo subito il tcp socket relativo:
	if(connessioni.length+1 > connSql.length) {
		conn.end('nack\r\n');
		conn.close();
		return;
	}
Se invece la conn TCP trova una corrispondente conn_mSql attivata allora la risposta al client sarà:
conn.write('Ready\r\n'); e il client potrà inoltrare il primo invio dati.

Per quanto concerne la gestione di fine inserimento dati in DB e notifica a client avremo:

function caricaRecord(qr,cndx) { // cndx = indice array connessioni TCP
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
       	connSql[cndx].execSql(request);	   	// connessione mSql in array con stesso indice conn. TCP
}

Qesta funzione viene caricata come 'stringa' in un array connSql[] dove ciascun elemento è creato con indice 
pari a ciascuna connTcp possibile. Al momento della richiesta di accesso al DB viene presa da eval() la 
prima connSql libera nell'array e quindi eseguita. La corrispondenza con la relativa conn Tcp è così già
inclusa nella funzione creata con eval(connSql[x]);


Soluzione con una singola connessione a DB mSql
-----------------------------------------------
Una via d'uscita sarebbe quella di accodare le richieste ricevute in un array che poi viene scaricato (le ralative
insert accumulate eseguite sequenzialmente in modo asincrono rispetto alle richieste ricevute) periodicamente 
via setTimeout con cadenza di 500mS (ad esempio). Questa soluzione però non sarebbe in grado di informare 
contestualmente il client sull'esito della sua richiesta (verrebbe risposto 'ack' subito ad ogni ricezione) il che 
non mi pare una bella trovata. La soluzione adottata in questa applicazione è quindi quella descritta sopra.



