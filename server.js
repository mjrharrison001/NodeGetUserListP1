/*Define dependencies.*/

var express=require("express");
var multer  = require('multer');
var path = require('path');
fs = require('fs');
var app=express();
var request = require('request');
var cheerio = require('cheerio');
var fs = require('fs');
var $ = require('jquery');
var latestUp = "";

//GLOBAL NEEDS TO BE RESET
//var globalFlagedEmails = '';

app.use(express.static(path.join(__dirname, 'public')));
app.use('/tablesorter',  express.static(__dirname + '/tablesorter'));

/*Configure the multer.*/

app.use(multer({ dest: './uploads/',
 rename: function (fieldname, filename) {
    return filename+Date.now();
  },
onFileUploadStart: function (file) {
  console.log(file.originalname + ' is starting ...')
},
onFileUploadComplete: function (file) {
  latestUp = file.path;
  console.log(file.fieldname + ' uploaded to  ' + file.path)
  done=true;



  fs.readFile(file.path, 'utf8', function (err,data) {
  if (err) {
    return console.log(err);
  }
  console.log("data");
});


}
}));

/*Handling routes.*/


app.get('/',function(req,res){
      res.sendfile("index.html");
});

app.get('/home',function(req,res){
      res.sendfile("index_1.html");
});

app.post('/api/uploads',function(req,res){
  if(done==true){
    res.sendfile("index_1.html");
    daemon();
  }
});

var options_fs = {encoding:'utf8', flag:'r'};
fs.readFile('index_1.html', options_fs, function(err, data){
  if (err){
    console.log("Failed to open index_1");
  } else {
    console.log("index.html loaded ok." );
    index_1Str = data;
  }
});

//run a daemon every 24 hours

function daemon() {
  console.log("---daemon running " + new Date().toString() );
   //create a file to export red and yellow data to
    fs.writeFile('redFlagLog.txt', '', function (err) {
    if (err) throw err;
    console.log('file saved.');
    });
    fs.writeFile('yellowFlagLog.txt', '', function (err) {
      if (err) throw err;
      console.log('file saved.');
    });
  bufferData(); // users daemon
}
setInterval( function() { daemon() },   120 * 1000);

function bufferData(){
  var input = fs.createReadStream(latestUp);
  readLines(input, makeTable);
  function readLines(input, makeTable) {
    var remaining = '';
    input.on('data', function(data) {
    remaining += data;
    });

    input.on('end', function() {
     makeTable(remaining);
    });
  }
}

//global return string
var returnString = 'string not yet buffered.. please allow up to 10 minutes';

app.get('/list', function (req, res) {
  res.connection.setTimeout(0);
  returnString = returnString;
  res.send(returnString);
});

function makeTable(data) {
  var dataArray = new Array();
  var lineCount = 0;
  var nameTemp = '';
  var surTemp = '';
  var userTemp = '';
  var intraTemp = '';
  for (var i = 0; i < data.length; i++){
    dataArray[lineCount] = new Array();
    while (data.charAt(i) != '\t'){
      nameTemp += data.charAt(i);
      i++;
    }
    dataArray[lineCount].push(nameTemp);
    i++;
    nameTemp = '';
    while (data.charAt(i) != '\t'){
      surTemp += data.charAt(i);
      i++;
    }
    dataArray[lineCount].push(surTemp);
    i++;
    surTemp = '';
    while (data.charAt(i) != '\t'){
      userTemp += data.charAt(i);
      i++;
    }
    dataArray[lineCount].push(userTemp);
    i++;
    userTemp = '';
    while (data.charAt(i) != '\n'){
      intraTemp += data.charAt(i);
      i++;
    }
    intraTemp = intraTemp.trim();
    dataArray[lineCount].push(intraTemp);
    intraTemp = '';
    lineCount++;
  }
  console.log("array generated. line count = " + lineCount);
  //console.log("array is = " + dataArray.toString() + "; Line Count = " + lineCount);
  //make AJAX call
  var empty = new Array();
  callAPI(dataArray, empty);
}

function callAPI(inArray, outArray, initialLength){
  //base case
  if (inArray.length == 0){
    console.log("done assembling bluepages array... ");
    updatePage(outArray);
  }
  else{
    outArray[outArray.length] = new Array();
    //console.log(inArray.length + inArray[0] + "; " + inArray[0][0]);
    outArray[outArray.length -1].push(inArray[0][0]);
    outArray[outArray.length -1].push(inArray[0][1]);
    outArray[outArray.length -1].push(inArray[0][2]);
    outArray[outArray.length -1].push(inArray[0][3]);
    //make call from inArray first element and add to outArray and remove it from inArray
    var currentEmail = inArray[0][3];
    var currentAddress = 'http://bluepages.ibm.com/BpHttpApisv3/wsapi?byInternetAddr=' + currentEmail;
    request(currentAddress, function(error, response, body){
      if (!error && response.statusCode == 200) {
        console.log("ping" + body.length);
        //store required data in out - indexOf returns -1 if the string does not exist
        var tempLocation = body.indexOf("JOBRESPONSIB:");
        //console.log("loca = " + tempLocation +  " char there is " + body.charAt(tempLocation));
        //they are not an IBMer
        if (tempLocation == -1){
          
          //are they yellow or red?
          var checkRedYellow = inArray[0][3].indexOf("ibm.com");
          if (checkRedYellow == -1){
            outArray[outArray.length -1][4] = "yellow";
          }
          else
            outArray[outArray.length -1][4] = "red";
        }
        //they are an IBMer
        else{
          outArray[outArray.length -1][4] = "green";
          //collect job responsibility
          var temp = '';
          while (body.charAt(tempLocation + 14) != '\n'){
            temp += body.charAt(tempLocation + 14);
            tempLocation++;
          }
          outArray[outArray.length -1][5] = temp;
          //collect Dept
          tempLocation = body.indexOf("DEPT:");
          temp = '';
          while (body.charAt(tempLocation + 6) != '\n'){
            temp += body.charAt(tempLocation + 6);
            tempLocation++;
          }
          outArray[outArray.length -1][6] = temp;
        }
        //remove first element
        inArray.shift();
        //recursive call
        callAPI(inArray, outArray);
      }
    })
  }
}

//load index_1
var index_1Str;
var options_fs = {encoding:'utf8', flag:'r'};
fs.readFile('index_1.html', options_fs, function(err, data){
  if (err){
    console.log("Failed to open index_1");
  } else {
    console.log("index.html loaded ok." );
    index_1Str = data;
  }
});

//update the webpage with the data
function updatePage(arr){
  //wk contains the html that will be replaced
  var wk;
  wk = '<table id="myTable" class="tablesorter"><thead><tr><th></th><th>Name</th><th>Surname';
  wk += '</th><th>Email</th><th>Status&nbsp;</th><th>Job Responsibility</th><th>Department&nbsp;</th><th>Bluepages Link</th></tr></thead><tbody>';
  for (var i = 0; i < arr.length; i++){
    //pass data to file system if red or yellow to prepare file for an export
    /*
    if (arr[i][4] == 'green'){
      wk += '<tr id="green">';
    }*/
    if (arr[i][4] == 'yellow'){
      appendYellow(arr[i]);
    }
    if (arr[i][4] == 'red'){
      appendRed(arr[i]);
    }
    
    wk+='<tr>';
    wk += '<td>' + (i + 1) + '</td>';
    for (var j = 0; j < arr[i].length; j++){
      if (j == 2 && j + 1 < arr[i].length){j++;}
      if (arr[i][4] == 'green' && j == 4){
        wk += '<td><hg>' + arr[i][j] + '</hg></td>';
      }
      else if (arr[i][4] == 'yellow' && j == 4){
        wk += '<td><hy>' + arr[i][j] + '</hy></td>';
      }
      else if (arr[i][4] == 'red' && j == 4){
        wk += '<td><hrr>' + arr[i][j] + '</hrr></td>';
      }
      else{
        wk += '<td>' + arr[i][j] + '</td>';
      }
    }
    //if they are yellow or red extend table over two columns
    if (arr[i][4] == 'yellow'){
      wk += '<td> </td><td></td>';
    }
    if (arr[i][4] == 'red'){
      wk += '<td> </td><td></td>';
    }
    //add link to bp's
    var bluepagesAddress = 'http://w3.ibm.com/jct03019wt/bluepages/simpleSearch.wss?searchBy=Internet+address&location=All+locations&searchFor=';
    var k = 0;
    
    while (arr[i][3].charAt(k) != '@' && k < arr[i][3].length){
      bluepagesAddress += arr[i][3].charAt(k);
      k++;
    }
    bluepagesAddress += '%40';
    k++;
    for (var  d = k; d < arr[i][3].length; d++){
      bluepagesAddress += arr[i][3].charAt(d);
    }
    wk += '<td><a href="' + bluepagesAddress + '" target="_blank">link</a></td>';

    }

  wk += '</tr>';
  wk += '</tbody></table>';
  
  
  index_1Str = index_1Str.replace(tempStr, wk);
  console.log("we should be ready now");
  returnString = index_1Str;
  tempStr = wk;
}

//made global to update
var tempStr = '<table id="myTable" class="tablesorter"><thead><tr><th>#</th><th>Header</th><th>Header</th><th>Header';
tempStr += '</th><th>Header</th></tr></thead><tbody><tr class="green"><td>NULL</td><td>NULL</td><td>NULL</td><td>NULL</td><td>NULL</td></tr></tbody></table>';

//append to yellow
function appendYellow(arr){
  var temp = '';
  for (var i = 0; i < arr.length; i++){
    temp += arr[i];
    temp += '\t';
  }
  temp += '\r\n';
  fs.appendFile('yellowFlagLog.txt', temp, function (err){
      if (err) throw err;
      console.log('file updated...');
  });
}

//append to red
function appendRed(arr){
  var temp = '';
  for (var i = 0; i < arr.length; i++){
    temp += arr[i];
    temp += '\t';
  }
  temp += '\r\n';
  fs.appendFile('redFlagLog.txt', temp, function (err){
      if (err) throw err;
      console.log('file updated...');
  });
}

//download yellow
var path = require('path');
//var mime = require('mime');
app.get('/downloadYellow', function(req, res){

  var file = __dirname + '/yellowFlagLog.txt';

  var filename = path.basename(file);
  //var mimetype = mime.lookup(file);

  res.setHeader('Content-disposition', 'attachment; filename=' + filename);
  //res.setHeader('Content-type', mimetype);

  var filestream = fs.createReadStream(file);
  filestream.pipe(res);
});

//download red
app.get('/downloadRed', function(req, res){

  var file = __dirname + '/redFlagLog.txt';

  var filename = path.basename(file);
  //var mimetype = mime.lookup(file);

  res.setHeader('Content-disposition', 'attachment; filename=' + filename);
  //res.setHeader('Content-type', mimetype);

  var filestream = fs.createReadStream(file);
  filestream.pipe(res);
});

/*Run the server.*/
app.listen(3000,function(){
    console.log("Working on port 3000");
});