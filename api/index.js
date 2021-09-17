require('dotenv').config()
const axios = require('axios');
const fs = require('fs');
const imageToBase64 = require('image-to-base64');
const server = require('fastify')({ logger: false });

const NASA_APOD_ENDPOINT = "https://api.nasa.gov/planetary/apod";
const API_KEY = process.env.API_KEY;

const TEMPLATE_FULL = fs.readFileSync(__dirname + '/templates/full.html', 'utf-8');

let APOD_DATA_AUTO_REFRESHED = null;

// Helper Functions
async function getApodData() {
    let res = await axios.get(NASA_APOD_ENDPOINT, {
        params: {
            api_key: API_KEY,
            thumbs: true,
        }
    });

    //console.log(res.data);
    return res.data;
}

async function refreshApodData() {
    APOD_DATA_AUTO_REFRESHED = await getApodData();
}

function initializeApodDataRefresher() {
    refreshApodData();
    setInterval(refreshApodData, 1000 * 60 * 60);
}

initializeApodDataRefresher();

// Server
server.get('/', async (request, reply) => {
    let apodData = APOD_DATA_AUTO_REFRESHED;
    let currentTemplate = TEMPLATE_FULL;
    
    if(!apodData) {
        reply.send('No data available.');
    }

    let mediaType = apodData['media_type'];
    let imageEncoded = (mediaType != 'video')
    ? await imageToBase64(apodData.url)
    : await imageToBase64(apodData['thumbnail_url']);

    if(mediaType != 'video') currentTemplate = currentTemplate.replace("Click to watch the video", "");

    currentTemplate = currentTemplate.replace("{{DATE}}", new Date(apodData.date).toDateString());
    currentTemplate = currentTemplate.replace("{{TITLE}}", encodeXml(apodData.title));
    currentTemplate = currentTemplate.replace("{{AUTHOR}}", apodData.copyright ? `by ${encodeXml(apodData.copyright)}`: "");
    currentTemplate = currentTemplate.replace("{{IMAGE}}", `data:image/png;base64, ${imageEncoded}`);

    reply.type('image/svg+xml');
    reply.header('Cache-Control', 's-maxage=60')
    reply.send(currentTemplate);
});

server.listen(process.env.PORT || 5000, process.env.HOST || '::', (err, address) => {
    if(err) {
        console.log(err);
    } else {
        console.log(`Server is listening at ${address}`);
    }
});

function encodeXml(s) {
    return (s
        .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
        .replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\t/g, '&#x9;').replace(/\n/g, '&#xA;').replace(/\r/g, '&#xD;')
    );
}
