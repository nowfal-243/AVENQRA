import 'package:flutter/material.dart';
import 'auth_provider.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  final AuthProvider authProvider;
  final VoidCallback onLoginSuccess;

  const LoginScreen({
    super.key,
    required this.authProvider,
    required this.onLoginSuccess,
  });

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  void _handleLogin() async {
    if (_formKey.currentState!.validate()) {
      final success = await widget.authProvider.login(
        email: _emailController.text.trim(),
        password: _passwordController.text,
      );

      if (success && mounted) {
        widget.onLoginSuccess();
      } else if (mounted && widget.authProvider.errorMessage != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.authProvider.errorMessage!),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _handleGoogleLogin() async {
    final success = await widget.authProvider.googleLogin(
      googleId: 'google_user_${DateUtils.dateOnly(DateTime.now()).millisecondsSinceEpoch}',
      email: 'citizen.google@avenqra.gov',
      name: 'Google Citizen User',
      avatarUrl: 'https://via.placeholder.com/150',
    );

    if (success && mounted) {
      widget.onLoginSuccess();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Icon(Icons.location_city, size: 64, color: Color(0xFF1E3A8A)),
                  const SizedBox(height: 12),
                  const Text(
                    'AVENQRA',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1E3A8A),
                      letterSpacing: 1.2,
                    ),
                  ),
                  const Text(
                    'Civic Infrastructure Resolution Platform',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.grey),
                  ),
                  const SizedBox(height: 36),
                  TextFormField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      labelText: 'Email Address',
                      prefixIcon: Icon(Icons.email_outlined),
                      border: OutlineInputBorder(),
                    ),
                    validator: (val) => val == null || !val.contains('@') ? 'Enter a valid email' : null,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _passwordController,
                    obscureText: _obscurePassword,
                    decoration: InputDecoration(
                      labelText: 'Password',
                      prefixIcon: const Icon(Icons.lock_outline),
                      suffixIcon: IconButton(
                        icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility),
                        onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                      ),
                      border: const OutlineInputBorder(),
                    ),
                    validator: (val) => val == null || val.length < 6 ? 'Password must be 6+ chars' : null,
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: widget.authProvider.isLoading ? null : _handleLogin,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: widget.authProvider.isLoading
                        ? const CircularProgressIndicator(color: Colors.white)
                        : const Text('LOG IN', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  ),
                  const SizedBox(height: 16),
                  OutlinedButton.icon(
                    onPressed: widget.authProvider.isLoading ? null : _handleGoogleLogin,
                    icon: const Icon(Icons.g_mobiledata, size: 28, color: Colors.red),
                    label: const Text('Continue with Google'),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text("Don't have an account? "),
                      GestureDetector(
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => RegisterScreen(
                                authProvider: widget.authProvider,
                                onRegisterSuccess: widget.onLoginSuccess,
                              ),
                            ),
                          );
                        },
                        child: const Text(
                          'Register Now',
                          style: TextStyle(
                            color: Color(0xFF1E3A8A),
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
