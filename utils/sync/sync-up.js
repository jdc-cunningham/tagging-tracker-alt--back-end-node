require('dotenv').config()
const { getUserIdFromToken } = require('../users/userFunctions');
const { pool } = require('./../../utils/db/dbConnect');
const { getDateTime } = require('./../../utils/datetime/functions');
const { uploadToS3 } = require('./../../utils/s3/uploadTag');
const { generateBuffer } = require('./sync-utils');

// import s3 stuff from module later
const AWS = require('aws-sdk');
const bucketName = process.env.AWS_S3_NAME;
AWS.config.update({region: process.env.AWS_S3_REGION});
const s3 = new AWS.S3({apiVersion: '2006-03-01'});

/**
 * The sync process goes like this:
 * create a sync_id which is just an auto incremented id(from sync_history table)
 * this is tied to the user_id
 * then the rows inserted into various tables use this sync_id.
 * Pulling down uses most recent(timestamp) and groups by that sync_id from sync_history
 */

// I suppose it is possible to steal a sync_id on accident eg. race condition but it doesn't really matter
// since it's just a unique reference
const getSyncId = async (userId) => {
    return new Promise(resolve => {
        pool.query(
            `INSERT INTO sync_history SET user_id = ?, sync_timestamp = ?`,
            [userId, getDateTime()], // no sync id on uploads
            (err, res) => {
                if (err) {
                    console.log('getSyncId', err);
                    resolve(false);
                } else {
                    resolve(res.insertId);
                }
            }
        );
    });
}

const formatTimeStr = (timeStr) => {
    if (timeStr.indexOf('T') !== -1) {
        timeStr = timeStr.split('T').join(' ').split('.000Z').join('');
    }

    return timeStr;
}

// I think these are still safe i.e. using param = ?
// https://stackoverflow.com/questions/8899802/how-do-i-do-a-bulk-insert-in-mysql-using-node-js
const insertAddresses = async (userId, syncId, addresses) => {
    // insert all rows in one INSERT using VALUES 80-90% faster than sequential individual inserts
    pool.query(
        `INSERT INTO addresses (user_id, address, lat, lng, created, updated, sync_id) VALUES ?`,
        [
            addresses.map(addressRow => (
                [userId, addressRow.address, addressRow.lat, addressRow.lng, formatTimeStr(addressRow.created), formatTimeStr(addressRow.updated), syncId]
            ))
        ],
        (err, qres) => {
            if (err) {
                console.log('insert address', err);
                throw Error(false);
            } else {
                return true;
            }
        }
    );
}

/**
 * TODO: This should use a job queue not upload to s3 synchronously
 * I will keep this as a non-batch upload due to the s3 that's still coupled at this time
 */
const insertTags = async (userId, syncId, tags) => {
    let insertErr = false;
    for (let i = 0; i < tags.length; i++) {
        if (insertErr) {
            break; // may be pointless
        }

        const tagRow = tags[i];

        // insert to s3
        // this should be part of the module
        const buff = generateBuffer(tagRow.src);
        const uploadParams = {
            Bucket: bucketName,
            Key: userId + '_' + tagRow.fileName, // this could be bad since there can be spaces in file names, although public display doesn't matter i.e. S3
            Body: buff,
            ACL: 'public-read',
            ContentEncoding: 'base64',
            ContentType: 'image/jpeg'
        };

        const s3PublicUrl = await uploadToS3(s3, uploadParams);

        // insert
        // this structure does not exactly match Dexie i.e. Dexie has the extra fileName column used for deletion on client side
        // create buffer for thumbnail src
        const thumbnailBuff = generateBuffer(tagRow.thumbnail_src.replace(/^data:image\/\w+;base64,/, ""), 'base64');
        pool.query(
            `INSERT INTO tags SET user_id = ?, address_id = ?, src = ?, thumbnail_src = ?,  public_s3_url= ?, meta = ?, sync_id = ?`,
            [userId, tagRow.addressId, buff, thumbnailBuff, s3PublicUrl, JSON.stringify(tagRow.meta), syncId],
            (err, qres) => {
                if (err) {
                    console.log('insert tags', err);
                    insertErr = true;
                    throw Error(false);
                } else {
                    if (i === tags.length - 1) {
                        return true;
                    }
                }
            }
        );
    }
}

const insertOwnerInfos = async (userId, syncId, ownerInfos) => {
    pool.query(
        `INSERT INTO owner_info (user_id, address_id, form_data, sync_id) VALUES ?`,
        [
            ownerInfos.map(ownerInfoRow => (
                [userId, ownerInfoRow.addressId, JSON.stringify(ownerInfoRow.formData), syncId]
            ))
        ],
        (err, qres) => {
            if (err) {
                console.log('insert ownerInfo', err);
                throw Error(false);
            } else {
                return true;
            }
        }
    );
}

// also sequential inserts like this is probably bad i.e. for loop
const insertTagInfos = async (userId, syncId, tagInfos) => {
    // insert
    // this structure does not exactly match Dexie i.e. Dexie has the extra fileName column used for deletion on client side
    pool.query(
        `INSERT INTO tag_info (user_id, address_id, form_data, sync_id) VALUES ?`,
        [
            tagInfos.map(tagInfoRow => (
                [userId, tagInfoRow.addressId, JSON.stringify(tagInfoRow.formData), syncId]
            ))
        ],
        (err, qres) => {
            if (err) {
                console.log('insert tagInfo', err);
                throw Error(false);
            } else {
                return true;
            }
        }
    );
}

const syncUp = async (req, res) => {
    // somehow req.token is available though sent from body
    const userId = await getUserIdFromToken(req.token);
    if (userId) {
        const syncId = await getSyncId(userId);
        const dataToSync = req.body.bundledData;
        let syncErr = false;

        if (typeof dataToSync.addresses !== "undefined") {
            syncErr = await insertAddresses(userId, syncId, dataToSync.addresses);
        }

        if (!syncErr && typeof dataToSync.tags !== "undefined") {
            syncErr = await insertTags(userId, syncId, dataToSync.tags);
        }

        if (!syncErr && typeof dataToSync.ownerInfo !== "undefined") {
            syncErr = await insertOwnerInfos(userId, syncId, dataToSync.ownerInfo); // mixed singular/plural not great, same with client side sync.js
        }

        if (!syncErr && typeof dataToSync.tagInfo !== "undefined") {
            syncErr = await insertTagInfos(userId, syncId, dataToSync.tagInfo);
        }

        if (syncErr) {
            res.status(400).send('Sync failed');
        } else {
            res.status(201).send('Sync successful');
        }
    } else {
        res.status(403);
    }
}

module.exports = {
    syncUp
}