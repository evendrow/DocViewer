var express = require('express');
var multer  = require('multer');
var fs = require('fs');
var chokidar = require('chokidar');

var exec = require('child_process').exec;
function execute(command, callback) {
	exec(command, function (err, stdout, stderr) {
		if (callback && stdout != null && stdout.length > 0)
			callback(stdout);
	})
}

function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

var watcher = chokidar.watch('uploads/', {
  ignored: /[\/\\]\./,
  // ignored: /[*.(?!pdf)]/,
  persistent: true
});

var log = console.log.bind(console);
var scanComplete = false;

var fileNameCallbacks = {};

watcher
  .on('add', function(path) { 
  	if (!scanComplete) return;
  	log('File', path, 'has been added');

  	path = path.split('/')[1];
  	console.log(fileNameCallbacks);

  	if (endsWith(path, '.pdf')) {
	  	if (path.indexOf('-') >= 0 && path.length > 36) {

	  		var newPath = path.substring(path.length-36);
	  		fs.rename('uploads/' + path, 'uploads/' + newPath, function() {
	  			processCallbacksForKey(path)
	  		})


	  	}
	  	else processCallbacksForKey(path);
	}
  })
  .on('ready', function() { 
  	log('Initial scan complete. Ready for changes.'); 
  	scanComplete = true;
});

function processCallbacksForKey(key) {
	if (fileNameCallbacks[key] && fileNameCallbacks[key].length) {
		fileNameCallbacks[key].forEach(function(callback) {
			callback();
		});
		delete fileNameCallbacks[key];
	}
}

function print(filename, callback) {
	console.log('printing file ' + filename + '...');

	var command = './soffice';
	command += ' --headless --convert-to pdf --outdir ~/Desktop/nodeProject/uploads'
	command += ' ~/Desktop/nodeProject/' + filename;

	var callbackName = filename.split('/')[1].split('.')[0];
	if (fileNameCallbacks[callbackName] && fileNameCallbacks[callbackName].length)
		fileNameCallbacks[callbackName].push(callback);
	else
		fileNameCallbacks[callbackName] = [callback];

	exec(command);
}

var app = express();

// app.use(express.bodyParser());
app.use(multer({ dest: './uploads/'}));

app.use(express.static(__dirname + '/public'));
app.use('/pdf', express.static(__dirname + '/uploads'));

app.get('/', function (req, res) {
	res.sendFile(path.join(__dirname+'/index.html'));
});

app.post('/upload', function (req, res) {
	if (req.files && req.files.file && req.files.file.name) {

		if (endsWith(req.files.file.name, '.pdf')) {
			//redirect
			res.redirect('/thumb.html?pdf='+req.files.file.name);
		} else {
			var file = req.files.file.name;

			print('uploads/' + file, function() {
				res.redirect('/thumb.html?pdf='+file.split('.')[0]+'.pdf');
			});
		}
		
	}
})

app.get('/upload', function (req, res) {
	res.redirect('/');
})

var server = app.listen(8888, function() {
  console.log('Server up and running');
});