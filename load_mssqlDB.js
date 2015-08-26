    var Connection = require('tedious').Connection;
    var Request = require('tedious').Request;
    var fs 	 = require('fs');
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

    var j = 0;
    // leggi tutto il file .csv in Array
    fs.readFile('./mytrips.csv', encoding='utf8', function(err,dati) {
    	if(err) {
    		console.log(err);
    	}
    	else {
        var recs = dati.split('\n');
        for(var i=0;i<recs.length-1;i++) {
          var obj = {};
          obj.data = recs[i];
          arrcs.push(obj);
        }
        var qr = "INSERT INTO plots values";
        
        for(var i=0;i<arrcs.length-1;i++) {
            qr += '(3319632137,'+arrcs[i].data+')';
            if(i%500 == 0 && i>0) {
                qrarr[j++] = qr;
                qr = "INSERT INTO plots values";
            }
            else
                qr += ',';
        }
        qr += '(3319632137,'+arrcs[i].data+')';
        qrarr[j++] = qr;
      }
        //buflen = Buffer.byteLength(JSON.stringify(arrcs), 'utf8');
      console.log("letti "+recs.length+" record");
      console.log("Creati "+j+" blocchi di insert");
    });

    var connection;

    if(!connection) {
        connection = new Connection(config);

        connection.on('connect' , function(err) {
          // If no error, then good to go...
          if(err)
            console.log('got an error %s',err)
          else {
            caricaRecord();
          }
        });
    }

    var p = 0;
    function caricaRecord() {
        
        var callback =  function(err, rowCount) {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log(rowCount + ' rows');
                        }
                        if(p<j)
                            caricaRecord();
                        else
                            connection.close();
                    };
    
        var request = new Request(qrarr[p++], callback);
                //request(qr,callback);
                request.on('done',function(rowCount, more) {
                    console.log(rowCount +' rows returned' );
                });
        connection.execSql(request);
    }

