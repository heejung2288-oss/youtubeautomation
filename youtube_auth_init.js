const fs = require('fs');
const { google } = require('googleapis');
const readline = require('readline');

// --- OAuth2 ?¤ì • (?Œì¼?ì„œ ?½ì–´??ê°??ìš©) ---
const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const REDIRECT_URI = "urn:ietf:wg:oauth:2.0:oob"; // ?°ìŠ¤?¬íƒ‘ ??ë°©ì‹

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const SCOPES = ['https://www.googleapis.com/auth/youtube.upload'];

async function getAuthUrl() {
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log("------------------------------------------------------------------");
    console.log("?Œ ?„ë˜ ë§í¬ë¥?ë¸Œë¼?°ì??ì„œ ?´ê³  'ë¡œê·¸???¹ì¸'???´ì£¼?¸ìš”:");
    console.log(authUrl);
    console.log("------------------------------------------------------------------");
    console.log("?¹ì¸ ???”ë©´???˜ì˜¤??'ì½”ë“œ'ë¥?ë³µì‚¬?´ì„œ ?„ë˜???…ë ¥??ì£¼ì„¸??");
}

getAuthUrl();
