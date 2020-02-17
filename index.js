require('dotenv').config({
    path: __dirname + '/.env'
});
const express = require('express');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const app = express();
const port = 5000;
const { loginUser } = require('./utils/auth/authFunctions');
const { verifyToken } = require('./utils/middleware/jwt');
const { uploadTags } = require('./utils/tags/uploadTags');
const { syncUp } = require('./utils/sync/sync-up'); // sync here eg. client pushing up
const { syncDown } = require('./utils/sync/sync-down');

let https;
let https_options;

// ssl if live
if (process.env.NODE_ENV === "live") {
    https = require('https');
    const fs = require('fs');
    https_options = {
        key: fs.readFileSync(`/etc/ssl/certs/namecheap/${process.env.SSL_CERT_BASE_FILE_NAME}.key`),
        cert: fs.readFileSync(`/etc/ssl/certs/namecheap/${process.env.SSL_CERT_BASE_FILE_NAME}.crt`),
        ca: [
            fs.readFileSync(`/etc/ssl/certs/namecheap/${process.env.SSL_CERT_BASE_FILE_NAME}.ca-bundle`)
        ]
    }

    // logging - https://stackoverflow.com/questions/8393636/node-log-in-a-file-instead-of-the-console
    const util = require('util');
    const log_file = fs.createWriteStream(process.env.LOG_PATH + '/tagging_tracker_api.log', {flags : 'w'});
    const log_stdout = process.stdout;

    console.log = function(d) { //
        log_file.write(util.format(d) + '\n');
        log_stdout.write(util.format(d) + '\n');
    };
}

// CORs
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.use(bodyParser.json({
    limit: '200mb' // payload too large error due to base64
}));

app.use(
    bodyParser.urlencoded({
        extended: true
    })
);

// middleware for handling mutli-part data
app.use(fileUpload());

// routes
app.get('/',(req, res) => {
    res.status(200).send('tt');
});

app.post('/login-user', loginUser);
app.post('/upload-tag', verifyToken, uploadTags);
app.post('/sync-up', verifyToken, syncUp); // these names are terrible
app.post('/sync-down', verifyToken, syncDown);

if (process.env.NODE_ENV === "live") {
    https.createServer(https_options, app).listen(443);
} else {
    app.listen(port, () => {
        console.log(`App running... on port ${port}`);
    });
}