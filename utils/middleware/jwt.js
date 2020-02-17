require('dotenv').config();
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    // get auth header value
    const bearerHeader = req.body.headers['Authorization'];
    // check if bearer undefined
    if (typeof bearerHeader !== 'undefined') {
        // split at the space
        const bearerToken = bearerHeader.split(" ")[1];
        // set the token
        req.token = bearerToken;
        // check token
        jwt.verify(req.token, process.env.JWT_SECRET_KEY, (err) => {
            if (err) {
                res.sendStatus(403);
            } else {
                next();
            }
        });
    } else {
        // Forbidden
        res.sendStatus(403);
    }
}

module.exports = {
    verifyToken
};