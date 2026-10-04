/**
 * Spoonful email relay (Google Apps Script)
 *
 * Spoonful's server posts a finished recipe email to this script, and the script sends it
 * from YOUR Google account. No paid email service is needed.
 *
 * Set up (about 5 minutes, details in the main README):
 *   1. Go to https://script.google.com and create a New project. Paste this whole file in.
 *   2. Change SECRET below to a long random string (20+ characters). Spoonful needs the same value.
 *   3. Run the function "testSend" once (Run button). Approve the permission prompt.
 *      A test email arrives in your own inbox.
 *   4. Deploy > New deployment > type "Web app".
 *        Execute as: Me        Who has access: Anyone
 *      Copy the Web app URL that ends in /exec.
 *   5. In Spoonful's .env set:
 *        EMAIL_RELAY_URL=<the /exec URL>
 *        EMAIL_RELAY_SECRET=<the same SECRET>
 *
 * After you edit this file later, use Deploy > Manage deployments > Edit > New version,
 * so the live web app picks up the change.
 *
 * Google limits how many emails a script can send per day: about 100 recipients on a free
 * Gmail account and about 1,500 on Google Workspace. Spoonful stops at EMAIL_DAILY_CAP
 * (default 80) before it reaches that limit.
 */

var SECRET = 'PASTE-A-LONG-RANDOM-STRING-HERE';

function doPost(e) {
  try {
    if (SECRET === 'PASTE-A-LONG-RANDOM-STRING-HERE' || SECRET.length < 16) {
      return reply_({ ok: false, error: 'set_secret' });
    }
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!safeEqual_(String(body.secret || ''), SECRET)) {
      return reply_({ ok: false, error: 'unauthorized' });
    }

    var to = String(body.to || '').trim();
    if (to.length > 254 || !/^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/.test(to)) {
      return reply_({ ok: false, error: 'bad_address' });
    }
    if (MailApp.getRemainingDailyQuota() < 1) {
      return reply_({ ok: false, error: 'quota' });
    }

    var options = {
      to: to,
      subject: String(body.subject || 'Your recipe').replace(/[\r\n]+/g, ' ').slice(0, 150),
      body: String(body.text || '').slice(0, 50000),
      name: String(body.fromName || 'Spoonful').replace(/[\r\n]+/g, ' ').slice(0, 60)
    };
    var html = String(body.html || '').slice(0, 150000);
    if (html) options.htmlBody = html;

    MailApp.sendEmail(options);
    return reply_({ ok: true });
  } catch (err) {
    console.error(err);
    return reply_({ ok: false, error: 'failed' });
  }
}

/** Open the /exec URL in a browser to check that the deployment is live. */
function doGet() {
  return ContentService.createTextOutput('Spoonful email relay is running.');
}

/** Run this once from the editor: it asks for permission and sends a test email to you. */
function testSend() {
  var me = Session.getEffectiveUser().getEmail();
  MailApp.sendEmail({
    to: me,
    subject: 'Spoonful relay test',
    body: 'If you can read this, the Spoonful email relay can send mail from this account.',
    name: 'Spoonful'
  });
  console.log('Test email sent to ' + me + '. Emails left today: ' + MailApp.getRemainingDailyQuota());
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Compares two strings without stopping at the first difference. */
function safeEqual_(a, b) {
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
