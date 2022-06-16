const { SESv2Client, SendEmailCommand } = require('@aws-sdk/client-sesv2');
const mimemessage = require('mimemessage');
const sesClient = new SESv2Client({ region: 'us-east-1' });

module.exports = async event => {
  // Prepare email
  const mailContent = mimemessage.factory({
    contentType: 'multipart/mixed',
    body: [],
  });

  mailContent.header('From', process.env.from);
  mailContent.header('To', process.env.recipient);
  mailContent.header('Subject', 'Test Email');

  const alternateEntity = mimemessage.factory({
    contentType: 'multipart/alternate',
    body: [],
  });

  const htmlEntity = mimemessage.factory({
    contentType: 'text/html;charset=utf-8',
    body:
      '<html>' +
      ' <head></head>' +
      ' <body>' +
      '   <h1>Test Email</h1>' +
      '   <p>Please see the attached file.</p>' +
      ' </body>' +
      '</html>',
  });
  const plainEntity = mimemessage.factory({
    body: 'Please see the attached file.',
  });
  alternateEntity.body.push(htmlEntity);
  alternateEntity.body.push(plainEntity);
  mailContent.body.push(alternateEntity);

  const mailData = mailContent.toString();

  // Send email
  const sendEmailResponse = await sesClient
    .send(
      new SendEmailCommand({
        Content: {
          Raw: {
            Data: mailData,
          },
        },
      })
    )
    .catch(error => console.log(error));
  console.log(sendEmailResponse);

  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: 'Farbank Inventory Export Emailed',
      },
      null,
      2
    ),
  };
};
