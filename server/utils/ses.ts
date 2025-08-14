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

  const sesEndpoint = `https://email.${config.ses.region}.amazonaws.com/v2/email/outbound-emails`
  const fromEmail = config.ses.fromEmail

  if (!fromEmail) {
    throw new Error('Please configure NUXT_SES_FROM_EMAIL.')
  }

  if (!message && !html) {
    throw new Error('Please provide either message or html.')
  }

  const body: { Text?: { Data: string }, Html?: { Data: string } } = {}
  if (message) {
    body.Text = {
      Data: message,
    }
  }
  if (html) {
    body.Html = {
      Data: html,
    }
  }

  const aws = new AwsClient({
    accessKeyId: config.ses.accessKeyId,
    secretAccessKey: config.ses.secretKey,
  })

  const emailParams = {
    FromEmailAddress: config.ses.fromEmail,
    Destination: {
      ToAddresses: toEmails,
    },
    ReplyToAddresses: replyToEmails,
    Content: {
      Simple: {
        Subject: {
          Data: subject,
        },
        Body: body,
      },
    },
  }

  const response = await aws.fetch(sesEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailParams),
  })
  if (response.status !== 200) {
    throw new Error('Failed to send email')
  }
}
