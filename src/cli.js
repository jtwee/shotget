'use strict';

const chalk = require('chalk');
const fs = require('fs');
const yargs = require('yargs');

const config = require('./config.js');
const shotget = require('./shotget.js');

const defaults = require('../defaults.json');

const parseArgs = (args) => {
    return yargs.options({
        config: {
            describe: 'A local config file to use (JSON or YAML)',
            config: true,
            normalize: true,
            configParser: config.readConfig,
            default: `${process.cwd()}/config.yaml`,
            defaultDescription: './config.yaml',
        },

        // Input Options
        domain: {
            describe: 'The domain for which we want to generate a screenshot',
            requiresArg: true,
        },
        file: {
            describe: 'A file containing path/url(s) we want to process (JSON, YAML or plain text)',
            requiresArg: true,
            conflicts: ['xml'],
        },
        paths: {
            alias: 'path',
            describe: 'One or more relative path(s) for which we want to generate a screenshot (space separated list)',
            type: 'array',
            requiresArg: true,
            implies: ['domain'],
            conflicts: ['urls', 'file', 'xml'],
        },
        urls: {
            alias: 'url',
            describe: 'One or more url(s) for which we want to generate a screenshot (space separated list)',
            type: 'array',
            requiresArg: true,
            conflicts: ['domain', 'file', 'paths'],
        },
        xml: {
            describe: 'A local xml file containing urls we want to process',
            requiresArg: true,
            conflicts: ['file', 'paths', 'urls'],
        },

        // Output Options
        'date-subfolder': {
            describe: 'Should the output be placed in date/time subfolders?',
            type: 'boolean',
            default: defaults.dateSubfolder,
        },
        label: {
            describe: 'The name of this job, used to create a subfolder for storing screenshot(s)',
            requiresArg: true,
        },
        'onload-script': {
            describe: 'JS file containing scripts to run on each page load prior to taking screenshot',
            default: `./${defaults.onloadScript}`,
            defaultDescription: `./${defaults.onloadScript}`,
            requiresArg: true,
        },
        'output-folder': {
            describe: 'Folder to save screenshot(s) into',
            default: defaults.outputFolder,
            requiresArg: true,
        },
        reference: {
            alias: 'ref',
            describe: 'The domain hosting our reference version(s)',
            requiresArg: true,
        },

        // Processing Options
        parallel: {
            describe: 'Run this number of parallel requests, set to 1 for sequential processing',
            type: 'number',
            default: defaults.parallel,
            requiresArg: true,
        },
        'same-domain-delay': {
            describe: 'Delay (in seconds) between requests to same domain',
            type: 'number',
            default: defaults.sameDomainDelay,
            requiresArg: true,
        },
        threshold: {
            describe: 'Difference threshold as a percentage (0-100)',
            type: 'number',
            default: defaults.threshold,
            requiresArg: true,
        },
        timeout: {
            describe: 'Timeout setting for each task in queue',
            type: 'number',
            default: defaults.timeout,
            requiresArg: true,
        },
        'viewport-height': {
            alias: 'vh',
            describe: 'The height of the browser viewport for taking a screenshot',
            type: 'number',
            default: defaults.viewportHeight,
            requiresArg: true,
        },
        'viewport-width': {
            alias: 'vw',
            describe: 'The width of the browser viewport for taking a screenshot',
            type: 'number',
            default: defaults.viewportWidth,
            requiresArg: true,
        },
        wait: {
            describe: 'Time (in seconds) to wait after loading to take the screenshot',
            type: 'number',
            default: defaults.wait,
            requiresArg: true,
        },
    })
        .group([
            'domain',
            'file',
            'paths',
            'urls',
            'xml',
        ], 'Input Options')
        .group([
            'date-subfolder',
            'label',
            'output-folder',
            'reference',
        ], 'Output Options')
        .group([
            'parallel',
            'same-domain-delay',
            'threshold',
            'timeout',
            'viewport-height',
            'viewport-width',
            'wait',
        ], 'Processing Options')
        .help()
        .alias('h', 'help')
        .wrap(Math.min(yargs.terminalWidth(), 130))
        .showHelpOnFail(false, 'Specify --help for available options')
        .parse(args);
};

const run = (args) => {
    const cliArgs = parseArgs(args);
    const options = {};

    if (cliArgs) {
        if (cliArgs.config) {
            options.config = cliArgs;
        }
        if (cliArgs.file && fs.existsSync(cliArgs.file) && fs.accessSync(cliArgs.file, fs.constants.R_OK) === undefined) {
            options.config.urls = fs.readFileSync(cliArgs.file, 'utf8').split('\n').filter(Boolean);
        }

        const job = config.init(options);

        if (job) {
            if (job.errors) {
                console.error(`${chalk.redBright('There were errors with the following settings in your configuration:')}:\n${job.errors.map(err => `  - ${chalk.bold(err)}`).join('\n')}`);
            } else {
                shotget.run(job).then((result) => {
                    console.log(result);
                });
            }
        } else {
            console.error(chalk.redBright('An unknown error occurred with your config, please check your settings and retry.'));
        }
    } else {
        console.error(chalk.redBright('An unknown error occurred with your cli arguments, please check your parameters and retry.'));
    }
};

module.exports = {
    run,
};
