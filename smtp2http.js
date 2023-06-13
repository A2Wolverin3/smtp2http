#!/usr/bin/env node
var squabble = require("squabble").createParser(),
    smtp = require("smtp-protocol"),
    http = require("request"),
    tlsfs = require("tlsfs"),
    copy = require("objektify").copy,
    MailParser = require("mailparser").MailParser,
    args, tlsTokens, serverOpts = {};

// enable color support
require("colors");

// setup CLI argument parsing
squabble.shortOpts().longOpts().stopper()
    .option("-T", "--tls")
    .option("-c", "--config")
    .option("--snap-dir")
    .flag("-s", "-q", "--silent", "--quiet")
    .flag("-v", "--verbose")
    .list("-H", "--header");

// parse and apply arguments
args = squabble.parse();
serverOpts.headers = {};
args.named["--header"].forEach(function(headerLine) {
    var name = headerLine.split(":")[0];
    serverOpts.headers[name] = serverOpts.headers[name] || [];
    serverOpts.headers[name].push(headerLine.substr(name.length+1).trim());
});

// read configuration
var configFile = args.named["--config"] ?? '/opt/smtp2http/config.json';
var snapDir = args.named["--snap-dir"] ?? '';
if (snapDir.length > 0) { // && !snapDir.endsWith("/")) {
    snapDir = snapDir + "/";
}
var config;
var data;
const fs = require('fs');
try {
    data = fs.readFileSync(configFile, 'utf8');
} catch (err) {
    console.log(`Error reading config.json: ${err}` + getTimestamp());
}

// parse JSON string to JSON object
config = JSON.parse(data);
console.log("Config file read, listening for connections." + getTimestamp());

// Pull serverOpts parameters
if (config.hasOwnProperty('serverOpts')) {
    serverOpts = config.serverOpts;
}

// Add sentinel input for non-matched messages
if (config.hasOwnProperty('logUnmatchedMessages') && config.logUnmatchedMessages) {
    config.inputs.push( { "match": null } );
}

// configure console output
if (args.named["--quiet"]) {
    console.log = function() {};
    console.error = function() {};
} else if (!args.named["--verbose"]) {
    //console.log = function() {};
}

if (args.named["--tls"]) {
    tlsPaths = args.named["--tls"].split(":");
    copy(serverOpts, tlsfs.readCertsSync(tlsPaths));
}

// create and start SMTP server
smtp.createServer(serverOpts, function(req) {
    var id;

    // accept all incoming messages
    //req.on("to", function(to, ack) {
    //    id = to;
    //    console.log("----->".yellow + " Incoming message to " + to + ". (" + getTimestamp() + ")");
    //    ack.accept();
    //});

    // send message to web endpoint
    req.on("message", function(stream, ack) {
        stream.pipe(new MailParser().on("end", function(email) {

            config.inputs.every(input => {
                if (input.match == null) {
                    // No match was found, but we log all messages.
                    console.log(">>>> Unmatched Message: ".red + email.subject + getTimestamp());
                    if (config.hasOwnProperty('logFullMessages') && config.logFullMessages) {
                        console.log(email.text);
                        console.log("<<<< End Unmatched Message".red);
                    }
                    return false; // Ie, stop iterating - although this was probably the last 'input' anyway.
                }
                //else if(email.text.includes(input.match)) {
                else if(email.subject.includes(input.match)) {
                    // Log the match
                    console.log(">>>> Found Match: ".blue + input.match.yellow + ", sending to " + input.postServer + getTimestamp());
                    if (config.hasOwnProperty('logFullMessages') && config.logFullMessages) {
                        console.log(email.text);
                    }

                    // Save attachments
                    if (input.saveAttachments != null) {
                        email.attachments.forEach(att => {
                            if (config.hasOwnProperty('logFullMessages') && config.logFullMessages) {
                                console.log("  ++: " + att.fileName);
                            }
                            var snapPath = snapDir + input.saveAttachments;
                            // Ensure the directory exists
                            fs.access(snapPath, (error) => {
                                // To check if given directory 
                                // already exists or not
                                if (error) {
                                  // If current directory does not exist then create it
                                  fs.mkdir(snapPath, { recursive: true }, (error) => {
                                    if (error) {
                                      console.log(error);
                                    }
                                  });
                                }
                            });
                            fs.writeFile(snapPath + "/" + att.fileName, att.content, err => {});
                        });
                    }
                    if (config.hasOwnProperty('logFullMessages') && config.logFullMessages) {
                        console.log("<<<< End Matched Message".blue);
                    }

                    // Post to HTTP
                    if (input.postServer != null) {
                        http.post({
                            url: input.postServer,
                            json: email,
                            headers: serverOpts.headers
                        }, function(err, res, body) {
                            var msg;

                            if (err) return console.error("error".red + " " + err.message);
                            msg = String(res.statusCode);
                            if (res.statusCode >= 500) {
                                console.log(msg.red + " " + body.message);
                            } else if (res.statusCode >= 200 && res.statusCode < 300) {
                                console.log(msg.green + " " + body.message);
                            } else {
                                console.error(msg.magenta + " unexpected");
                                console.log(msg.magenta + " unexpected");
                            }
                        });
                    }

                    // Stop looking for matches.
                    return false;
                }
                else {
                    // Was not a match. Keep iterating.
                    return true;
                }
            });

        }).on("error", function(err) {
            console.error(err);
        }));
        ack.accept();
    });
}).listen(process.env.SMTP_PORT || 25, "0.0.0.0");


function getTimestamp(dt = new Date())
{
    //var dt = new Date();

    let year = dt.getFullYear();
    let month = ("0" + (dt.getMonth() + 1)).slice(-2);
    let day = ("0" + dt.getDate()).slice(-2);
    let hour = ("0" + dt.getHours()).slice(-2);
    let minute = ("0" + dt.getMinutes()).slice(-2);
    let seconds = ("0" + dt.getSeconds()).slice(-2);

    return " [" + year + "-" + month + "-" + day + " " + hour + ":" + minute + ":" + seconds + "]";
}
