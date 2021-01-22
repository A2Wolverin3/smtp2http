# smtp2http
SMTP to HTTP gateway

Notes
-----
I am trying to adapt this to be used for motion notifications on a Reolink Secuirty Camera NVR for use with Apple HomeKit.
This is a work in progress and should not be used as is.

Changes Required
-----
Need to be able to reference a config file when launching the application
Should remove the optional SSL/TLS functions
Inbound SMTP messages should be parsed by reading the subject line
Subject line should look for words that match the camera ID's in the config.xml file
If Subject line contains any of the camera-IDs
Then for each camera-ID
Post a URL for each action listed in the config.xml

Example:
If an e-mail arrives that the subject reads, "Motion Detection from Front Door at 01/01/2021 01:11:11"
Then any camera named "Front Door" should make an HTTP post for the "motion" and "doorbell" actions.
Those requests should look like, http://localhost:8081/motion?Front%20Door and http://localhost:8081/doorbell?Front%20Door

This will generate a motion indicator and a doorbell indicator to homekit, if enabled as such. If the function is not enabled, then it will do nothing.

Usage
-----
```sh
Usage: smtp2http [-v|--verbose] [-s|--silent|-q|--quiet]
    [-T|--tls=<tls_opt>] [[-H|--header=<header>], ...] ENDPOINT

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
specified HTTP endpoint.
```sh
smtp2http https://example.com/foo
```

Updated version should refer to a config file
```sh
smtp2http config.xml
```

### TLS Support
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

Install
-------
```sh
git clone https://github.com/rpruden/smtp2http
cd smtp2http
npm install -g
```

Development
-----------
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
