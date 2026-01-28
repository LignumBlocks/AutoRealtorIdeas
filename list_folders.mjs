import { google } from 'googleapis';
import fs from 'fs';
const key = JSON.parse(fs.readFileSync('/opt/rei-api/service-account.json', 'utf8'));
const auth = new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ['https://www.googleapis.com/auth/drive']
});
const drive = google.drive({ version: 'v3', auth });
try {
    const res = await drive.files.list({
        q: "name = 'Auto_Realtor_Ideas' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
        fields: 'files(id, name, owners)'
    });
    console.log('Folders found matching name:');
    console.log(JSON.stringify(res.data.files, null, 2));
} catch (e) {
    console.error(e.message);
}
