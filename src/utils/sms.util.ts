import axios from 'axios';

let smsUsername: string = process.env.SMS_USERNAME
let smsPassword: string = process.env.SMS_PASSWORD
let messageSendingApi: string = process.env.SMS_SENDING_API
let senderId: string = process.env.SENDER_ID

export type Message = {
  id: string
  content: string
}

// send message ( fetch the api )
export const sendSms = async (recepientPhoneNumber: string, message: Message) => {

  // Define the message details
  const bulkSms = {
    reference_id: message.id, // Use the messageId as reference_id
    sms: message.content, // Replace with actual SMS content
    receiver_phone: recepientPhoneNumber, // Replace with actual recipient's phone number
  };

  // Prepare parameters for the POST request
  const params = {
    request_id: message.id + Date.now(),
    sender_id: message.id,
    sms_body: bulkSms.sms,
    username: smsUsername,
    password: smsPassword,
    channel: 2,
    recipients_numbers: [bulkSms.receiver_phone],
  };

  // Send the message using Axios
  try {
    const response = await axios.post(messageSendingApi, params, {
      headers: {
        'Content-Type': 'application/json',
      },
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }), // Disable SSL verification
    });
    console.log('SMS sent successfully:', response.data);
    return 'SMS Sent Successfully'
  } catch (error) {
    console.error('Failed to send SMS:', error.message);
    return 'Failed to send SMS'
  }
};


