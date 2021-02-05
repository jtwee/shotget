'use strict';

const fs = require('fs');
const path = require('path');
const xmldom = require('xmldom');
const yaml = require('js-yaml');

const utils = require('./utils.js');

const configDefaults = require('../defaults.json');

const readConfig = (filename) => {
    if (filename && fs.existsSync(filename) && fs.accessSync(filename, fs.constants.R_OK) === undefined) {
        if (/\.ya?ml$/.test(filename)) {
            return yaml.load(fs.readFileSync(filename, 'utf8'), { json: true });
        } else if (/\.json$/.test(filename)) {
            return JSON.parse(fs.readFileSync(filename, 'utf8'));
        }
    }
};

const validate = (config) => {
    if (typeof config.sameDomainDelay === 'undefined') {
        config.errors = config.errors || [];
        config.errors.push('sameDomainDelay');
    }
    if (typeof config.outputFolder === 'undefined') {
        config.errors = config.errors || [];
        config.errors.push('outputFolder');
    }
    if (typeof config.parallel === 'undefined') {
        config.errors = config.errors || [];
        config.errors.push('parallel');
    }
    if (typeof config.threshold === 'undefined') {
        config.errors = config.errors || [];
        config.errors.push('threshold');
    }
    if (typeof config.timeout === 'undefined') {
        config.errors = config.errors || [];
        config.errors.push('timeout');
    }
    if (typeof config.viewportHeight === 'undefined') {
        config.errors = config.errors || [];
        config.errors.push('viewportHeight');
    }
    if (typeof config.viewportWidth === 'undefined') {
        config.errors = config.errors || [];
        config.errors.push('viewportWidth');
    }
    if (typeof config.wait === 'undefined') {
        config.errors = config.errors || [];
        config.errors.push('wait');
    }
    if (typeof config.urls === 'undefined' || !config.urls || !config.urls.length || config.urls.filter(el => !/^https?:\/\/[^/]+/.test(el)).length) {
        config.errors = config.errors || [];
        config.errors.push('urls');
    }
    if (typeof config.folder === 'undefined' || !fs.existsSync(config.folder) || !fs.statSync(config.folder).isDirectory() || fs.accessSync(config.folder, fs.constants.W_OK) !== undefined) {
        config.errors = config.errors || [];
        config.errors.push('folder');
    }

    return config;
};

const getUrls = (config) => {
    // Return urls if they're already set
    if (config.urls && Array.isArray(config.urls) && config.urls.filter(el => !/^https?:\/\/[^/]+/.test(el)).length === 0) {
        return config.urls;
    }

    // Parse paths/urls
    if (config.domain) {
        let pathArray;
        if (config.paths && Array.isArray(config.paths)) {
            pathArray = config.paths;
        } else if (config.urls && Array.isArray(config.urls)) {
            pathArray = config.urls;
        }
        return pathArray.map((path) => {
            if (/^https?:\/\/[^/]+/.test(path)) {
                return path;
            }

            const separator = config.domain.endsWith('/') || path.startsWith('/') ? '' : '/';
            return `${config.domain}${separator}${path}`;
        });
    }

    // Parse xml sitemap
    if (config.xml && fs.existsSync(config.xml)) {
        return Array.from(new xmldom.DOMParser().parseFromString(fs.readFileSync(config.xml).toString(), 'text/xml').getElementsByTagName('loc')).map(v => v.firstChild.data);
    }

    return [];
};

const initScreenshotFolder = (config) => {
    let success = false;

    if (!config.folder) {
        let folder = config.outputFolder.startsWith('/') ? config.outputFolder : `${process.cwd()}/${config.outputFolder}`;

        if (config.label) {
            folder = `${folder}/${config.label}`;
        }

        if (config.dateSubfolder) {
            folder = `${folder}/${utils.getFormattedDatetime(config.execTime)}`;
        }

        config.folder = path.normalize(folder);
    }

    try {
        fs.mkdirSync(config.folder, { recursive: true });
    } catch (err) {
        console.error('Error creating the output folder: ', err);
    }

    success = fs.existsSync(config.folder) && fs.statSync(config.folder).isDirectory() && fs.accessSync(config.folder, fs.constants.W_OK) === undefined;

    if (config.reference) {
        const refFolder = `${config.folder}/reference`;

        try {
            fs.mkdirSync(refFolder, { recursive: true });
        } catch (err) {
            console.error('Error creating the output folder: ', err);
        }

        success = success && fs.existsSync(refFolder) && fs.statSync(refFolder).isDirectory() && fs.accessSync(refFolder, fs.constants.W_OK) === undefined;
    }

    return success;
};

const init = (options = {}) => {
    let job = {};

    if (options.config) {
        job = { ...configDefaults, ...options.config };
    } else {
        job = configDefaults;
    }

    job.urls = getUrls(job);

    job.execTime = new Date();

    job.onloadScript = job.onloadScript.startsWith('/') ? job.onloadScript : `${process.cwd()}/${job.onloadScript}`;

    return initScreenshotFolder(job) && validate(job);
};

module.exports = {
    init,
    readConfig,
    validate,
};
