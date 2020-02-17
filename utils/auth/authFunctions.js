require('dotenv').config()
const bcrypt = require('bcrypt');
const saltRounds = 15;
const jwt = require('jsonwebtoken');
const { pool } = require('./../../utils/db/dbConnect');

const loginUser = (req, res) => {
    // get these from post params
    if (
        !Object.keys(req.body).length ||
        typeof req.body.username === "undefined" ||
        typeof req.body.password === "undefined"
    ) {
        res.status(401).send('No user/pass provided');
    }
    
    const username = req.body.username;
    const password = req.body.password;

    let passwordHash;
    
    pool.query(
        `SELECT password_hash FROM users WHERE username = ?`,
        [username],
        (err, qres) => {
            if (err) {
                res.status(401).send('Failed to login');
            } else {
                if (qres.length && typeof qres[0].password_hash !== "undefined") {
                    passwordHash = qres[0].password_hash;
                    _comparePasswords(res, username, password, passwordHash);
                } else {
                    res.status(401).send('Failed to login');
                }
            }
        }
    );
}

// private
const _comparePasswords = (res, username, password, passwordHash) => {
    bcrypt.compare(password, passwordHash, (err, bres) => { // this is bad bres
        if (err || !bres) {
            res.status(401).send('Failed to login');
        }

        jwt.sign({username}, process.env.JWT_SECRET_KEY, {expiresIn: process.env.JWT_EXPIRES}, (err,token) => {
            if (token) {
                _issueToken(res, token);
            } else {
                res.status(401).send('Failed to login');
            }
        });
    });
}

// private
const _issueToken = (res, token) => {
    if (token) {
        res.status(200).json({token});
    } else {
        res.status(401);
    }
}

// underscored methods(private) should not be exported
module.exports = {
    loginUser
}
