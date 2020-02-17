require('dotenv').config();
const jwt = require('jsonwebtoken');
const { getDateTime } = require('./../datetime/functions');
const { pool } = require('./../../utils/db/dbConnect');

const getRecentAddresses = (req, res) => {
    // auth
    // jwt.verify(req.token, process.env.JWT_SECRET_KEY, (err, authData) => {
        //     if (err) {
        //         res.sendStatus(403);
        //     } else {
            // console.log(req.body);
            // res.json({
            //     message: 'Post created...',
            //     authData
            // });
            // res.sendStatus(201);
    //     }
    // });

    pool.query(
        `SELECT id, address FROM addresses ORDER BY updated DESC LIMIT 10`,
        (err, qres) => {
            if (err) {
                res.status(400).send('failed to get recent addresses');
            } else {
                res.status(200).send(qres);
            }
        }
    );
}

module.exports = {
    getRecentAddresses
};
