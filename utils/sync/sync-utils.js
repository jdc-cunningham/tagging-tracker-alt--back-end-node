const generateBase64FromBinaryBuffer = (blobStr) => {
    if (!blobStr) {
        return "";
    }

    // these could be "wrong" since changing to JPG from PNG or whatever
    return "data:image/jpeg;base64," + new Buffer.from(blobStr, 'binary').toString('base64');
}

const generateBuffer = (srcStr) => {
    if (!srcStr) {
        return "";
    }
    
    return new Buffer.from(srcStr.replace(/^data:image\/\w+;base64,/, ""), 'base64');
}

module.exports = {
    generateBase64FromBinaryBuffer,
    generateBuffer
}