# smtp2http
SMTP to HTTP gateway for sending motion notifications to Homebridge from security cameras or NVR.

Notes
-----
This code has been adapted from another project and modified. This setup has been explicitely setup to be used for motion notifications on a Reolink Secuirty Camera NVR for use with Apple HomeKit.

How This Works
-----
Reolink NVR detects motion and sends a motion alert via e-mail. The HomeBridge Server (Raspberry Pi) is configured as the SMTP server and parses all e-mails that are sent through it regardless of the sender/receiver indicated. When a motion alert is received, the e-mail is read and depending on the content of the e-mail it will post an HTTP response to the appropriate URL which tells HomeBridge to notify HomeKit that there is motion for a specific camera. This also works for virtual doorbell notifications as well.

The path of communication looks like this;
Reolink NVR --> SMTP Server --> HTTP Server --> HomeBridge --> HomeKit

The SMTP server, HTTP server, and Homebridge are all one shared instance. So it really looks like this;

Reolink NVR --> Raspberry Pi --> HomeKit

Usage
-----
```sh
Usage: smtp2http [-v|--verbose] [-s|--silent|-q|--quiet]
    [-T|--tls=<tls_opt>] [[-H|--header=<header>], ...]

 -H --header=<header>   HTTP header to send with requests
 -q --quiet             Do not log to STDERR
 -s --silent            Alias for --quiet
 -T --tls=<tls_opt>     colon-delimited list of cert files
                        q.v. TLS Option below
 -v --verbose           Log information to STDOUT

TLS Option
The --tls option accepts a colon-delimited list of certificate files.
You can specify a single combined PFX file, a cert file followed by a
key file, or a cert file followed by a key file followed by a signing
authority certificate.
```


Examples
--------
Begin listening for incoming SMTP messages, parse them, and post them to the
specified HTTP endpoints indicated in config.jason.
```sh
smtp2http
```

Instructions
--------
To setup motion notifications using this tool with your NVR you must first install the application and modify the config file. The configuration file is a standard JSON file that performs mapping of NVR channels to specific HomeBridge Cameras.

The "match" portion of the config file searches the entire body of the email. You can use this to customize which text should be present to trigger the motion alert. By default the "Alarm Input Channel No.:" string will work with Reolink NVR and the number will increment for each channel 1-16. You can choose to query a manually specified camera name instead if you want.

The "postServer" portion of the config file indicates which URL to post the motion notification to. This will vary depending on your HomeBridge installation and configuration. From within the Homebridge Camera FFmpeg plugin, if you have enabled the Motion and/or Doorbell functions under the automation tab for your camera you will be able to check for the port number by looking at the raw config. Within the Camera FFmpeg section of your config look for the port number. You can join this with http://localhost:8081/motion? or http://localhost:8081/doorbell? You will need to add your camera name as specified within home bridge after the "?". If there are any spaces in your camera names, you must replace them with "%20". See the example below.

I recommend to setup all 8 or 16 channels for your cameras. To avoid having to make changes to the config, I would recommend adding both the motion and doorbell URLs so that you can simply turn those features on/off within homebridge. Even if you don't enable both functions for all cameras, it's better to have the config there in case you decide to change settings later.

In the example below, you can see that if the motion notification e-mail contains "Alarm Input Channel No.:1" that it will post to both a motion and doorbell URL. If the e-mail contains "Alarm Input Channel No.:2" then it will post to just the motion URL.

```
{
  "inputs": [
    { "match": "Alarm Input Channel No.:1", "postServer": "http://localhost:8081/motion?Front%20Door" },
    { "match": "Alarm Input Channel No.:1", "postServer": "http://localhost:8081/doorbell?Front%20Door" },
    { "match": "Alarm Input Channel No.:2", "postServer": "http://localhost:8081/motion?Driveway" }
  ]
}
```

After you have installed the application and configured the config.json file, you can setup the SMTP server on your Reolink NVR. You will need to enter the IP address of your Raspberry Pi as the mail server using port 25 and no authentication. You can enter any to and from addresses that you want, it will process the e-mails either way. Make sure that you click the test e-mail button to make sure that your NVR is properly communicating with the SMTP server. You will also need to ensure that your Reolink app is set to send e-mails when motion is detected. You can do this within the Reolink mobile app or the web interface. You should send the e-mails WITHOUT any attachment as that will just slow things down and cause a delay in your notifications.

Installation
-------
```sh
cd /opt
git clone https://github.com/rpruden/smtp2http
cd smtp2http
npm install -g
cp logrotate/smtp2http /etc/logrotate.d/smtp2http
```
You may need to use sudo for some of these commands. 

If this is your first installation, you will need to create a config file. You can start by making a copy of the config.sample.json file.
```sh
cp config.sample.json config.json
```
You can now modify the config.json to suport your camera names as they are configured for your specific environment.

After installation, you you will need to set the smtp2http executable to run at startup. There are several ways to do this. I did this by doing the following;

```sh
sudo nano /etc/rc.local
```

Add the following line to the bottom before the line that reads "exit 0"
```sh
sudo smtp2http >> /var/logs/smtp2http.log &
```
This will cause the program to run with sudo privilages (which it needs to open port 25) and save the output to the log.
Save the file and then reboot to test.

TLS Support
-----------
For the purpose of this project, TLS/SSL should not be required.

Enable TLS using separate certificate and key files with signing CA cert.
```sh
CERT=/etc/private/ssl/example.com.crt
KEY=/etc/private/ssl/example.com.key
CA=/etc/private/ssl/example.com-ca.crt
smtp2http -T$CERT:$KEY:$CA https://example.com/foo
```

Enable TLS using cert and key files only.
```sh
CERT=/etc/private/ssl/example.com.crt
KEY=/etc/private/ssh/example.com.key
smtp2http -T$CERT:$KEY https://example.com/foo
```

Enable TLS using single PFX combined cert file.
```sh
CERT=/etc/private/ssl/example.com.pfx
smtp2http -T$CERT https://example.com/foo
```

Development
-----------
Public access should be un-necessary for this project. We will only be sending e-mails internally across the LAN. This section can probably be skipped for most users.

The SMTP protocol does not provide any way to set the TCP port used for
communication.  Because of this, development can be difficult if trying to
use public mail providers because you must have an internet facing server
listening on port 25.

You can run something like the following to set up a reverse tunnel using
a public server to which you have SSH access.

```sh
ssh -fNR 25:localhost:2025 root@example.com
SMTP_PORT=2025 smtp2http
```

In this example, `example.com` is the public server to which you have access,
`root` is a user with access to open low-numbered ports on that host, `25` is
the port this host will listen on (standard SMTP port), and `2025` is the port
`smtp2http` will listen on.

Appendix - Generating a PFX cert
--------------------------------
If you have a typical PEM cert with separate key and cert files, you may wish
to generate a PFX cert which is simple to specify.

```sh
openssl pkcs12 -export \
    -out example.com.pfx \
    -in example.com.crt -inkey example.com.key \
    -certfile example.com-ca.crt
```
