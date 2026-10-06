import 'package:flutter/material.dart';
import 'auth_provider.dart';

class OtpVerificationScreen extends StatefulWidget {
  final AuthProvider authProvider;
  final String email;
  final VoidCallback onVerificationSuccess;

  const OtpVerificationScreen({
    super.key,
    required this.authProvider,
    required this.email,
    required this.onVerificationSuccess,
  });

  @override
  State<OtpVerificationScreen> createState() => _OtpVerificationScreenState();
}

class _OtpVerificationScreenState extends State<OtpVerificationScreen> {
  final _otpController = TextEditingController();

  @override
  void initState() {
    super.initState();
    // Auto-fill dev OTP for ease of testing
    if (widget.authProvider.devOtpCode != null) {
      _otpController.text = widget.authProvider.devOtpCode!;
    }
  }

  void _handleVerify() async {
    if (_otpController.text.length == 6) {
      final success = await widget.authProvider.verifyOtp(
        email: widget.email,
        otpCode: _otpController.text.trim(),
      );

      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Account verified successfully! Welcome to AVENQRA.')),
        );
        widget.onVerificationSuccess();
      } else if (mounted && widget.authProvider.errorMessage != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.authProvider.errorMessage!),
            backgroundColor: Colors.red,
          ),
        );
      }
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a 6-digit OTP code')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Verify Account'),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Icon(Icons.mark_email_read_outlined, size: 64, color: Color(0xFF1E3A8A)),
              const SizedBox(height: 16),
              const Text(
                'Enter Verification Code',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                'We have sent a 6-digit code to:\n${widget.email}',
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.grey),
              ),
              if (widget.authProvider.devOtpCode != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.amber.shade100,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    '⚡ Dev Auto OTP: ${widget.authProvider.devOtpCode}',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontWeight: FontWeight.bold, color: Colors.amber.shade900),
                  ),
                ),
              ],
              const SizedBox(height: 32),
              TextField(
                controller: _otpController,
                keyboardType: TextInputType.number,
                maxLength: 6,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 28, letterSpacing: 12, fontWeight: FontWeight.bold),
                decoration: const InputDecoration(
                  counterText: '',
                  hintText: '------',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: widget.authProvider.isLoading ? null : _handleVerify,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: widget.authProvider.isLoading
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('VERIFY ACCOUNT', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
