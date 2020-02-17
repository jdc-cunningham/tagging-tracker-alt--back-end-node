require('dotenv').config();

const mysql = require('mysql2');
const connection = mysql.createConnection({
    host: 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASS
});

// connect to mysql, assumes above works eg. mysql is running/credentials exist
connection.connect((err) => {
    if (err) {
        console.error('error connecting: ' + err.stack);
        return;
    }
});

// check if database exists, if not create it
connection.query('CREATE DATABASE IF NOT EXISTS `tagging_tracker`', (error, results, fields) => {
    if (error) {
        console.log('error checking if tagging_tracker database exists:', error.sqlMessage);
        return;
    }
});

// use the database
connection.query('USE tagging_tracker', (error, results, fields) => {
    if (error) {
        console.log('an error occurred trying to use the tagging_tracker database', error);
        return;
    }
});

// build the various tables and their schemas, stole these straight out of phpmyadmin ha
// users
connection.query(
    'CREATE TABLE `users` (' +
        '`id` int(11) NOT NULL AUTO_INCREMENT,' +
        '`username` varchar(255) COLLATE utf8_unicode_ci NOT NULL,' +
        '`password_hash` varchar(255) COLLATE utf8_unicode_ci NOT NULL,' +
        '`active` tinyint(4) NOT NULL,' +
        'PRIMARY KEY (`id`)' +
       ') ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci',
    (error, results, fields) => {
        if (error) {
            console.log('error creating table users:', error.sqlMessage);
            return;
        }
    }
)

// addresses -- will get modified to include user_id so know which account made what entries
connection.query(
    'CREATE TABLE `addresses` (' +
        '`id` int(11) NOT NULL AUTO_INCREMENT,' +
        '`user_id` int(11) NOT NULL,' +
        '`address` varchar(255) COLLATE utf8_unicode_ci NOT NULL,' +
        '`lat` decimal(10,8) NOT NULL,' +
        '`lng` decimal(11,8) NOT NULL,' +
        '`created` datetime NOT NULL,' +
        '`updated` datetime NOT NULL,' +
        '`sync_id` int(11) NOT NULL,' +
        'PRIMARY KEY (`id`)' +
        ') ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci',
    (error, results, fields) => {
        if (error) {
            console.log('error creating table addresses:', error.sqlMessage);
            return;
        }
    }
)

// tags, medium blob is good up to 16MB, long blob is overkill at 4GB
connection.query(
    'CREATE TABLE `tags` (' +
        '`id` int(11) NOT NULL AUTO_INCREMENT,' +
        '`user_id` int(11) NOT NULL,' +
        '`address_id` int(11) NOT NULL,' +
        '`src` mediumblob NOT NULL,' +
        '`thumbnail_src` mediumblob NOT NULL,' +
        '`public_s3_url` varchar(2083) COLLATE utf8_unicode_ci NOT NULL,' +
        '`meta` text COLLATE utf8_unicode_ci NOT NULL,' +
        '`sync_id` int(11) NOT NULL,' +
        'PRIMARY KEY (`id`)' +
        ') ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci',
    (error, results, fields) => {
        if (error) {
            console.log('error creating table tags:', error.sqlMessage);
            return;
        }
    }
)

// create owner info table
connection.query(
    'CREATE TABLE `owner_info` (' +
        '`id` int(11) NOT NULL AUTO_INCREMENT,' +
        '`user_id` int(11) NOT NULL,' +
        '`address_id` int(11) NOT NULL,' +
        '`form_data` text COLLATE utf8_unicode_ci NOT NULL,' +
        '`sync_id` int(11) NOT NULL,' +
        'PRIMARY KEY (`id`)' +
        ') ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci',
    (error, results, fields) => {
        if (error) {
            console.log('error creating table owner_info:', error.sqlMessage);
            return;
        }
    }
)

// create tag info table
connection.query(
    'CREATE TABLE `tag_info` (' +
        '`id` int(11) NOT NULL AUTO_INCREMENT,' +
        '`user_id` int(11) NOT NULL,' +
        '`address_id` int(11) NOT NULL,' +
        '`form_data` text COLLATE utf8_unicode_ci NOT NULL,' +
        '`sync_id` int(11) NOT NULL,' +
        'PRIMARY KEY (`id`)' +
        ') ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci',
    (error, results, fields) => {
        if (error) {
            console.log('error creating table tag_info:', error.sqlMessage);
            return;
        }
    }
)

// create sync history table
connection.query(
    'CREATE TABLE `sync_history` (' +
        '`id` int(11) NOT NULL AUTO_INCREMENT,' +
        '`user_id` int(11) NOT NULL,' +
        '`sync_timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,' +
        'PRIMARY KEY (`id`)' +
        ') ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci',
    (error, results, fields) => {
        if (error) {
            console.log('error creating table sync_history:', error.sqlMessage);
            return;
        }
    }
)

connection.end();