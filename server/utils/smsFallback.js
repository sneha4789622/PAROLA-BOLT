/**
 * SMS Fallback Service (Simulated)
 * ---------------------------------------------------------------------
 * Parola Bolt's signature offline-messaging feature. When a recipient
 * is offline (no active socket connection), the platform "falls back"
 * to SMS delivery so the message still reaches the user's phone.
 *
 * This implementation SIMULATES the SMS send/delivery lifecycle so the
 * full UX (queued -> sent -> delivered) can be demonstrated end-to-end
 * without a real telecom provider. To go live, swap `sendSimulatedSMS`
 * for a real provider call (e.g. Twilio's messages.create) using the
 * SMS_PROVIDER_SID / SMS_PROVIDER_AUTH_TOKEN / SMS_FROM_NUMBER env vars.
 */

const sendSimulatedSMS = async ({ toMobileNumber, body }) => {
  console.log(`[SMS FALLBACK] Simulating SMS to ${toMobileNumber}: "${body.slice(0, 80)}"`);

  // Simulate network latency for the "sent" stage
  await new Promise((resolve) => setTimeout(resolve, 300));

  return {
    status: 'sent',
    provider: 'simulated',
    sentAt: new Date(),
  };
};

/**
 * Simulates the full async delivery confirmation. In a real
 * integration this would come from a provider webhook.
 */
const simulateDeliveryConfirmation = async (message, io) => {
  setTimeout(() => {
    message.smsFallback.status = 'delivered';
    message.smsFallback.simulatedAt = new Date();
    message
      .save()
      .then(() => {
        if (io) {
          io.to(`chat:${message.chat}`).emit('message:sms_status_update', {
            messageId: message._id,
            status: 'delivered',
          });
        }
      })
      .catch((err) => console.error('SMS delivery simulation error:', err.message));
  }, 1500);
};

module.exports = { sendSimulatedSMS, simulateDeliveryConfirmation };
