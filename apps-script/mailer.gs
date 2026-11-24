/**
 * Choreinator mailer — a Google Apps Script web app.
 *
 * Runs as the house Google account and sends the "your chore" emails with MailApp.
 * Setup (once):
 *   1. script.google.com > New project, paste this file in.
 *   2. Project Settings > Script properties > add  SECRET = <same value as EMAIL_WEBHOOK_SECRET>.
 *   3. Deploy > New deployment > type "Web app": Execute as "Me", Who has access "Anyone".
 *      Authorize when asked. Copy the Web app URL (ends in /exec) into EMAIL_WEBHOOK_URL.
 *
 * "Anyone" only means the URL is reachable; every request must carry the SECRET or
 * it is refused, and the script can only send what it's given to the listed people.
 */
function doPost(e) {
  var out = function (obj) {
    return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
  };
  try {
    var req = JSON.parse(e.postData.contents);
    var secret = PropertiesService.getScriptProperties().getProperty("SECRET");
    if (!secret || req.secret !== secret) return out({ ok: false, error: "bad secret" });

    var messages = req.messages || [];
    if (messages.length > MailApp.getRemainingDailyQuota()) {
      return out({ ok: false, error: "not enough daily email quota left" });
    }
    var sent = 0;
    var failed = [];
    messages.forEach(function (m) {
      try {
        MailApp.sendEmail({ to: m.to, subject: m.subject, htmlBody: m.html, body: m.text, name: "Choreinator" });
        sent++;
      } catch (err) {
        failed.push(m.to);
      }
    });
    return out({ ok: true, sent: sent, failed: failed });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}
