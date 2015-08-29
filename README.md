# tcp_server_digistyle
JS tcp_server per servire raccolta dati da parte di client che li inviano secondo un protocollo TCP socket
con un formato record tale da permettere al server di inserire i dati in un uSoft SQL Server poi accessibile
per consultazioni e statistiche.

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
La soluzione adottata è la seguente:

function caricaRecord(qr,cndx) { // cndx è l'indice nell'array connessioni TCP che identifica il client socket
       	var callback = function(err, rowCount) {
		   				var cnx = cndx;
                        if (err) {
                            console.log(err);
							logga(err.toString()+'\n');
							connessioni[cnx].write('nack\r\n');
							
                        } else {
                            console.log(rowCount + ' rows');
							logga("Inserito "+rowCount+' record\n');
							connessioni[cnx].write('ack\r\n');
                        }
                    };
       	
		var request = new Request(qr,callback); // quando la callback sarà chiamata essa conterrà gli opportuni
												// riferimenti per informare il client sull'esito della 
												// richiesta inoltrata (ack / nack)
       	connSql[cndx].execSql(request);
		request.on('done',function(rowCount, more) {
                    	console.log(rowCount +' rows returned' );
						logga(rowCount +' rows returned\n'); 
                	});  		   
}
In questo modo il client ha la notifica di come è stata eseguita la sua richiesta e, ricevendo ack, può inviarne
una nuova sicuro che la precedente sia nadata a buon fine, oppure reinviare la stessa richiesta nel caso abbia 
ricevuto 'nack'.

Soluzione con una singola connessione a DB mSql
-----------------------------------------------
Una via d'uscita sarebbe quella di accodare le richieste ricevute in un array che poi viene scaricato (le ralative
insert accumulate eseguite sequenzialmente in modo asincrono rispetto alle richieste ricevute) periodicamente 
via setTimeout con cadenza di 500mS (ad esempio). Questa soluzione però non sarebbe in grado di informare 
contestualmente il client sull'esito della sua richiesta (verrebbe risposto 'ack' subito ad ogni ricezione) il che 
non mi pare una bella trovata. La soluzione adottata in questa applicazione è quindi quella descritta sopra.
