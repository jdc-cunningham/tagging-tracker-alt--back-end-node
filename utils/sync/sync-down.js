require('dotenv').config()
const { getUserIdFromToken } = require('../users/userFunctions');
const { pool } = require('./../../utils/db/dbConnect');
const { getDateTime } = require('./../../utils/datetime/functions');
const { generateBase64FromBinaryBuffer } = require('./sync-utils');

const getRecentSyncId = (userId) => {
    return new Promise(resolve => {
        pool.query(
            `SELECT id FROM sync_history WHERE user_id = ? ORDER BY sync_timestamp DESC LIMIT 1`,
            [userId],
            (err, res) => {
                if (err) {
                    console.log('select sync id', err);
                    resolve(false);
                } else {
                    if (res.length) {
                        resolve(res[0].id);
                    } else {
                        resolve(false);
                    }
                }
            }
        );
    });
}

const getAddressesFromRecentSync = (syncId) => {
    return new Promise(resolve => {
        pool.query(
            `SELECT address, lat, lng, created, updated FROM addresses WHERE sync_id = ? ORDER BY id`, // limit? no pagination in mind
            [syncId],
            (err, res) => {
                if (err) {
                    console.log('sync down get addresses', err);
                    resolve(false);
                } else {
                    if (res.length) {
                        resolve(res);
                    } else {
                        resolve(false);
                    }
                }
            }
        );
    });
}

const getTagsFromRecentSync = (syncId) => {
    return new Promise(resolve => {
        pool.query(
            `SELECT address_id, src, thumbnail_src, public_s3_url, meta FROM tags WHERE sync_id = ? ORDER BY id`,
            [syncId],
            (err, res) => {
                if (err) {
                    console.log('sync down get tags', err);
                    resolve(false);
                } else {
                    if (res.length) {
                        // convert binary to base64
                        resolve(res.map((tagRow) => {
                            const tagMeta = JSON.parse(tagRow.meta);
                            return {
                                name: tagMeta.name,
                                address_id: tagRow.address_id,
                                // this has to match how it was saved i.e. in sync-up.js or uplaodTags.js
                                src: generateBase64FromBinaryBuffer(tagRow.src),
                                thumbnail_src: generateBase64FromBinaryBuffer(tagRow.thumbnail_src),
                                meta: tagRow.meta // stringify client side
                            };
                        }));
                    } else {
                        resolve(false);
                    }
                }
            }
        );
    });
}

const getOwnerInfoFromRecentSync = (syncId) => {
    return new Promise(resolve => {
        pool.query(
            `SELECT address_id, form_data FROM owner_info WHERE sync_id = ? ORDER BY id`,
            [syncId],
            (err, res) => {
                if (err) {
                    console.log('sync down get owner info', err);
                    resolve(false);
                } else {
                    if (res.length) {
                        resolve(res);
                    } else {
                        resolve(false);
                    }
                }
            }
        );
    });
}

const getTagInfoFromRecentSync = (syncId) => {
    return new Promise(resolve => {
        pool.query(
            `SELECT address_id, form_data FROM tag_info WHERE sync_id = ? ORDER BY id`,
            [syncId],
            (err, res) => {
                if (err) {
                    resolve(false);
                } else {
                    if (res.length) {
                        resolve(res);
                    } else {
                        resolve(false);
                    }
                }
            }
        );
    });
}

const syncDown = async (req, res) => {
    const userId = await getUserIdFromToken(req.token);
    const syncId = await getRecentSyncId(userId);
    if (!syncId) {
        res.status(200).send(false);
    } else {
        const bundledData = {};
        bundledData['addresses'] = await getAddressesFromRecentSync(syncId);
        bundledData['tags'] = await getTagsFromRecentSync(syncId);
        bundledData['ownerInfo'] = await getOwnerInfoFromRecentSync(syncId);
        bundledData['tagInfo'] = await getTagInfoFromRecentSync(syncId);
        res.status(200).send(bundledData);
    }
}

module.exports = {
    syncDown
}