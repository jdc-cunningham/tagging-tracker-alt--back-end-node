require('dotenv').config();
const jwt = require('jsonwebtoken');

const testAuth = (req, res) => {
    jwt.verify(req.token, process.env.JWT_SECRET_KEY, (err, authData) => {
        if (err) {
            res.sendStatus(403);
        } else {
            res.json({
                message: 'Post created...',
                authData
            });
        }
    });
}

module.exports = {
    testAuth
};