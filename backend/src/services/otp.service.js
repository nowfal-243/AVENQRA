class OTPService {
  /**
   * Generates a 6-digit numeric OTP string
   */
  static generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Sends OTP to user via SMS/Email (Simulated for development)
   */
  static async sendOTP(recipient, otpCode) {
    console.log(`[OTP SERVICE] 📩 Sending 6-digit OTP [${otpCode}] to ${recipient}`);
    // In production, integrate Twilio SMS API or Nodemailer SMTP:
    // await twilioClient.messages.create({ body: `Your AVENQRA verification code is: ${otpCode}`, from: '+123456', to: recipient });
    return true;
  }
}

module.exports = OTPService;
