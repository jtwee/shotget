'use strict';

const { URL } = require('url');
const crypto = require('crypto');

const getFilenameFromUrl = (url, ext = 'png') => {
    const urlParts = new URL(url);

    return `${((urlParts.pathname + urlParts.search).slice(1) || '_homepage').toLowerCase().replace(/[^a-z0-9-_]/g, '_')}.${ext}`;
};

const getIdFromUrl = (url) => {
    const urlParts = new URL(url);

    return crypto
        .createHash('md5')
        .update(`${((urlParts.pathname + urlParts.search).slice(1) || '_homepage').toLowerCase().replace(/[^a-z0-9-_]/g, '_')}`)
        .digest('hex');
};

const getFormattedDatetime = (datetime = new Date()) => {
    return `/${datetime.getFullYear()}${(datetime.getMonth() + 1).toString().padStart(2, '0')}${datetime.getDate().toString().padStart(2, '0')}/${datetime.toTimeString().replace(/^(\d\d):(\d\d):(\d\d).*$/, '$1$2$3')}`;
};

module.exports = {
    getFilenameFromUrl,
    getFormattedDatetime,
    getIdFromUrl,
};
