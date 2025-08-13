import { AwsClient } from 'aws4fetch'

interface SendEmailParams {
  toEmails: string[]
  replyToEmails?: string[]
  subject: string
  message?: string
  html?: string
}

export async function sendSesEmail({
  toEmails,
  replyToEmails = [],
  subject,
  message,
  html,
}: SendEmailParams): Promise<void> {
  const config = useRuntimeConfig()

  const SES_API = `https://email.${config.ses.region}.amazonaws.com/v2/email/outbound-emails`

  const aws = new AwsClient({
    accessKeyId: config.ses.accessKeyId,
    secretAccessKey: config.ses.secretKey,
  })

  const emailParams = {
    FromEmailAddress: config.ses.from,
    Destination: {
      ToAddresses: toEmails,
    },
    ReplyToAddresses: replyToEmails,
    Content: {
      Simple: {
        Subject: {
          Data: subject,
        },
        Body: {
          Text: {
            Data: message,
          },
          Html: {
            Data: html,
          },
        },
      },
    },
  }

  await aws.fetch(SES_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailParams),
  })
}