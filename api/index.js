const axios = require('axios');
const fs = require('fs');
const imageToBase64 = require('image-to-base64');
const server = require('fastify')({ logger: false });

const NASA_APOD_ENDPOINT = "https://api.nasa.gov/planetary/apod";
const API_KEY = process.env.API_KEY;

const TEMPLATE_FULL = fs.readFileSync(__dirname + '/templates/full.html', 'utf-8');


// Helper Functions
async function getApodData() {
    let res = await axios.get(NASA_APOD_ENDPOINT, {
        params: {
            api_key: API_KEY
        }
    });

    return res.data;
}

// Server
server.get('/', async (request, reply) => {
    let apodData = await getApodData();
    let imageEncoded = await imageToBase64(apodData.url);

    let currentTemplate = TEMPLATE_FULL;
    currentTemplate = currentTemplate.replace("{{DATE}}", new Date(apodData.date).toDateString());
    currentTemplate = currentTemplate.replace("{{IMAGE}}", `data:image/png;base64, ${imageEncoded}`);
    currentTemplate = currentTemplate.replace("{{TITLE}}", apodData.title);
    currentTemplate = currentTemplate.replace("{{AUTHOR}}", apodData.copyright);

    reply.type('image/svg+xml');
    reply.send(currentTemplate);
});

server.listen(process.env.PORT || 5000, (err, address) => {
    if(err) {
        console.log(err);
    } else {
        console.log(`Server is listening at ${address}`);
    }
});