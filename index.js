const puppeteer = require('puppeteer');
const request = require('request');
const cheerio = require('cheerio')
const fs = require('fs');
const screenshotsFolder = 'screenshots';
const sharp = require('sharp');
const path = require('path');
const _ = require('lodash');
const sysURL = require('url');

function doRequest(url) {
    return new Promise(function (resolve, reject) {
        request(url, function (error, res, body) {
            if (!error && res.statusCode == 200) {
                resolve(body);
            } else {
                reject(error);
            }
        });
    });
}


async function hackerNewsScreenshots() {
    const HACKERNEWS_HOST = "https://news.ycombinator.com/";

    ensureFolders(screenshotsFolder);
    ensureFolders('screenshots-resized');

    let body = await doRequest(HACKERNEWS_HOST);
    const $ = cheerio.load(body);

    let links = $(".itemlist .athing").map((i, ele) => {
        let id = $(ele).attr('id');
        let title = $(ele).find(".title .storylink").text();
        let url = $(ele).find(".title .storylink").attr("href");
        let points = $(ele).next().find(".score").text();

        if (url.indexOf('http') < 0) {
            url = `${HACKERNEWS_HOST}/${url}`;
        }

        return {
            title: title,
            url: url,
            host: sysURL.parse(url).hostname,
            points: points,
            commentsUrl: `https://news.ycombinator.com/item?id=${id}`
        };
    }).get();

    for (let link of links) {
        let url = link["url"];
        if (url.indexOf(".pdf") > 0) {
            continue;
        }
        try {
            if (screenshotsExists(url)) {
                console.log(`Skip ${url}`);
            } else {
                await getScreenshot(url);
            }

            // double check if the image exists now or not
            if (screenshotsExists(url)) {
                link.image = `${hashUrl(url)}.png`;
                link.b2_image = `screenshots-compressed/${link.image}`;
            }
        } catch (e) {
            console.log(e);
            console.log(`Exception when getting screenshot of ${url}`);
        }
    }

    let linksData = {links: links, lastUpdatedAt: (new Date()).toString()};

    fs.writeFileSync('./public/data.json', JSON.stringify(linksData), {encoding: 'utf-8'});

    // default theme
    generateHTML(linksData, 'index.html');

    // light theme
    let lightLinksData = _.clone(linksData);
    lightLinksData.theme = 'light';
    generateHTML(lightLinksData, 'light.html');

    return links;
};


function ensureFolders(folder) {
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder);
    }
}


function hashUrl(url) {
    var crypto = require('crypto');
    var hash = crypto.createHash('md5').update(url).digest('hex');
    return hash;
}


function screenshotsExists(url) {
    return fs.existsSync(`${screenshotsFolder}/${hashUrl(url)}.png`);
}


async function getScreenshot(url) {
    console.log(`Screenshot -> ${url}`);

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    page.setViewport({width: 1280, height: 900});

    try {
        await page.goto(url);
        let imgPath = `${screenshotsFolder}/${hashUrl(url)}.png`;
        await page.screenshot({path: imgPath});

        await compressImg(imgPath)
        
    } catch (e) {
        console.log(`Exception when getting screenshot of ${url}`);
        console.log(e);
    }

    browser.close();
}


async function compressImg(imgPath) {
    const imagemin = require('imagemin');
    const imageminPngquant = require('imagemin-pngquant');
    let basename = path.basename(imgPath);
    let resizedImgPath = `./screenshots-resized/${basename}`

    await sharp(imgPath).resize(560).toFile(resizedImgPath);

    await imagemin([resizedImgPath], 'screenshots-compressed', {
        plugins: [
            imageminPngquant({quality: '85-90'})
        ]
    });
}

const Handlebars = require('handlebars');

function generateHTML(links, outFile) {
    let source = fs.readFileSync('./index.html.handlebars', {encoding: 'utf-8'});
    let template = Handlebars.compile(source);

    let result = template(links);
    fs.writeFileSync(`./public/${outFile}`, result, {encoding: 'utf-8'});
}


hackerNewsScreenshots()
