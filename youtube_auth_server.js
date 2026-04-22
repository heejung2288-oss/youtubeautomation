const fs = require('fs');
const http = require('http');
const url = require('url');
const { google } = require('googleapis');

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:3000";

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
const SCOPES = ['https://www.googleapis.com/auth/youtube.upload'];

const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
});

const server = http.createServer(async (req, res) => {
    if (req.url.startsWith('/')) {
        const q = url.parse(req.url, true).query;
        if (q.code) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end('<h1>?¸ì¦ ?±ê³µ!</h1><p>?´ì œ ?°ë??ë¡œ ?Œì•„ê°€??ê²°ê³¼ë¥??•ì¸?˜ì„¸?? ??ì°½ì„ ?«ìœ¼?”ë„ ?©ë‹ˆ??</p>');
            
            const { tokens } = await oauth2Client.getToken(q.code);
            fs.writeFileSync('tokens.json', JSON.stringify(tokens, null, 2));
            console.log("???¸ì¦ ?±ê³µ! tokens.json ?Œì¼???ì„±?˜ì—ˆ?µë‹ˆ??");
            process.exit(0);
        }
    }
}).listen(3000);

console.log("------------------------------------------------------------------");
console.log("?? ë¡œì»¬ ?¸ì¦ ?œë²„ê°€ ?œì‘?˜ì—ˆ?µë‹ˆ??(?¬íŠ¸ 3000)");
console.log("------------------------------------------------------------------");
console.log("?Œ ?„ë˜ ë§í¬ë¥?ë¸Œë¼?°ì??ì„œ ?´ê³  'ë¡œê·¸???¹ì¸'???´ì£¼?¸ìš”:");
console.log(authUrl);
console.log("------------------------------------------------------------------");
