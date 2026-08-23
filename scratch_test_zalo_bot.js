const https = require('https');

const token = '2294655560219778902:jzfmNEYGuXlSvmyKEYeCrbSWIKGrmumxQhoSsFXkgNBXsnOaWWDwTjSYqjoAdaqp';
const webhookUrl = 'https://script.google.com/macros/s/AKfycbxVmGzjDVBLFilgPthtok2J5QOxifOEoUyLkIbGSCXY1jm9xm41oU4kvWBypdeVPpNF/exec';

function testEndpoint(path, body) {
  return new Promise((resolve) => {
    const postData = body ? JSON.stringify(body) : '';
    const req = https.request({
      hostname: 'bot-api.zaloplatforms.com',
      path: '/bot' + token + path,
      method: body ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(body ? { 'Content-Length': Buffer.byteLength(postData) } : {})
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('[bot' + path + '] -> Status: ' + res.statusCode + ' | Body: ' + data);
        resolve({ status: res.statusCode, data });
      });
    });
    req.on('error', err => {
      console.log('[bot' + path + '] Error: ' + err.message);
      resolve({ error: err });
    });
    if (body) req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('Testing setWebhook with secret_token...');
  await testEndpoint('/setWebhook', { 
    url: webhookUrl,
    secret_token: 'ZaloBotTkb2026Secret'
  });
}

run();
