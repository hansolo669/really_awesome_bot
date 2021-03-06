var irc = require('irc');
var exec = require('child_process').exec;
fs = require('fs');
var path = require('path');

if ( !String.prototype.contains ) {//string contains polyfill.
    String.prototype.contains = function() {
        return String.prototype.indexOf.apply( this, arguments ) !== -1;
    };
}

var plugins = [];//init plugin global
var conf = {};//init conf global
var client;//init client global
function init(){
	fs.readdir(path.join(__dirname + '/plugins'), function(err, files){
		for (var i = 0; i < files.length; i++) {
			var plugin = require(path.join(__dirname + '/plugins/' + files[i]));
			plugins.push(plugin);
		}
		console.log("Loaded Plugins!");
	});
	fs.readFile(path.join(__dirname + '/reallyawesome.json'), function(err,data){
		conf = (JSON.parse(data));
		console.log(conf.chan);
		client = new irc.Client(conf.server, conf.name,{
			userName: conf.name,
			realName: 'ReallyAwesomeBot.js',
			autoConnect: false//so we dont go connecting before we load the conf and break EVERYTHING AAAAAHHHHHHHHHHHHHHHH
		});

		client.connect(function(){
			for (var i = 0; i < conf.chan.length; i++) {//loops through the chans and connects to each
				client.join(conf.chan[i]);
			};
		});
		start();
	});
};
init();

function start(){
	for (var i = 0; i < conf.chan.length; i++) {
		var chan = conf.chan[i];
		new addbot(chan);//istance the bot for each channel. keeps the plugins from invading other channels

	}

	new addbot(conf.name, true);//instance the bot for pm's. the channel is the bots name

	function addbot(chan, pm){
		/*
		* our bot!
		* each extension gets a copy of this, plus some additional paramaters
		* bot.name
		* bot.content
		* bot.from
		*/
		var bot = {
			listen : function(c, callback){//listen for commands directed at the bot
				var namer = "^" + conf.name;
				namer = new RegExp(namer, "i");
				if (bot.message.match(namer)) {
					var command = bot.message.split(" ");
					command = command[1];
					if (command.match(c)) {
						var commandregex = "^" + command;
						commandregex = new RegExp(commandregex, "i");
						var content = bot.message.replace(namer, " ").trim();
						content = content.replace(commandregex, " ").trim();
						callback(content, bot.from);
					}
				}
			},
			on : function(m, callback){//passes all messages through
				if (bot.message.match(m)){
					callback(bot.message, bot.from);
				}
			},
			name: conf.name,
			plugins: plugins
		}

		
		if (!pm) {//adds a listener either to a whole channel, or just to pm's
			client.addListener('message' + chan, function(from, message){
				new reply(from, message);
			});
		} else {
			client.addListener('pm', function(from, message){
				new reply(from, message);
			});
		}

		function reply(from, message){
			bot.say = function(response){//say things
				console.log(chan);
				client.say(chan, response);
			}

			bot.respond = function(response){//send private messages
				client.say(from, response);
			}

			bot.message = message;//so we know what the message is
			bot.from = from;//so we know who its from
			bot.channel = chan;
			for (var i = 0; i < plugins.length; i++) {
				plugins[i](bot);
			};
		}
	}
	client.addListener('error', function(message) {
	    console.log('error: ', message);
	});
};