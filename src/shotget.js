'use strict';

const chalk = require('chalk');
const { Cluster } = require('puppeteer-cluster');
const compareImages = require('resemblejs/compareImages');
const figures = require('figures');
const fs = require('fs-extra');
const { URL } = require('url');

const config = require('./config.js');
const utils = require('./utils.js');

const getScreenshots = async (job) => {
    const output = {};
    let onloadScript;

    if (fs.existsSync(job.onloadScript) && fs.accessSync(job.onloadScript, fs.constants.R_OK) === undefined) {
        onloadScript = require(job.onloadScript);
    }

    const cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_PAGE,
        maxConcurrency: job.parallel,
        sameDomainDelay: job.sameDomainDelay,
        timeout: job.timeout * 1000,
        puppeteerOptions: {
            defaultViewport: {
                width: job.viewportWidth,
                height: job.viewportHeight,
            },
        },
    });

    await cluster.task(async ({ page, data: { url, context } }) => {
        const urlParts = new URL(url);
        const targetUrl = context === 'reference' ? url.replace(urlParts.origin, job.reference) : url;
        const outputFolder = context === 'reference' ? `${job.folder}/reference` : job.folder;
        const outputFilename = `${outputFolder}/${utils.getFilenameFromUrl(url)}`;
        const relativeFilename = outputFilename.replace(process.cwd(), '.');
        const pageId = utils.getIdFromUrl(url);

        if (!fs.existsSync(outputFilename)) {
            await page.on('close', () => {
                output[pageId] = output[pageId] || {};
                output[pageId][context === 'reference' ? 'refFilename' : 'filename'] = relativeFilename;
                output[pageId][context === 'reference' ? 'refUrl' : 'url'] = targetUrl;
                output[pageId][context === 'reference' ? 'refTitle' : 'title'] = page._target._targetInfo.title;
                console.log(`${chalk.greenBright(figures.tick)} ${targetUrl} ${figures.arrowRight} ${relativeFilename}`);
            });
            await page.goto(targetUrl);
            if (onloadScript) {
                page.evaluate(onloadScript);
            }
            await page.waitForTimeout(job.wait * 1000);
            await page.screenshot({
                path: outputFilename,
                fullPage: true,
            });
        } else {
            output[pageId] = output[pageId] || {};
            output[pageId][context === 'reference' ? 'refFilename' : 'filename'] = relativeFilename;
            output[pageId][context === 'reference' ? 'refUrl' : 'url'] = targetUrl;
            output[pageId][context === 'reference' ? 'refTitle' : 'title'] = page._target._targetInfo.title;
        }
    });

    for (const url of job.urls) {
        cluster.queue({ url });

        if (job.reference) {
            cluster.queue({ url, context: 'reference' });
        }
    }

    await cluster.idle();
    await cluster.close();

    return output;
};

const compare = async (shotPair) => {
    const data = await compareImages(
        await fs.readFile(shotPair.filename),
        await fs.readFile(shotPair.refFilename),
        {
            output: {
                largeImageThreshold: 0,
                outputDiff: true,
            },
            scaleToSameSize: true,
            ignore: 'antialiasing',
        }
    );

    await fs.writeFile(`${shotPair.refFilename.replace('.png', '-diff.png')}`, data.getBuffer());

    return data;
};

const run = async (job) => {
    if (!job.errors || !config.validate(job).errors) {
        const output = await getScreenshots(job);

        if (job.reference) {
            for (const pageId of Object.keys(output)) {
                output[pageId].differenceData = await compare(output[pageId]);
            }
        }

        return output;
    }
};

module.exports = {
    run,
};
