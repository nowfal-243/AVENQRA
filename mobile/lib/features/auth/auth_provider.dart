import 'package:flutter/material.dart';
import '../../core/services/auth_service.dart';

class AuthProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  bool _isAuthenticated = false;
  bool get isAuthenticated => _isAuthenticated;

  Map<String, dynamic>? _user;
  Map<String, dynamic>? get user => _user;

  String? _errorMessage;
  String? get errorMessage => _errorMessage;

  String? _devOtpCode;
  String? get devOtpCode => _devOtpCode;

  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  void _setError(String? message) {
    _errorMessage = message;
    notifyListeners();
  }

  Future<bool> checkAuthStatus() async {
    try {
      final token = await _authService.getToken();
      if (token != null && token.isNotEmpty) {
        final profile = await _authService.getProfile();
        _user = profile;
        _isAuthenticated = true;
        notifyListeners();
        return true;
      }
    } catch (_) {
      await _authService.clearToken();
      _isAuthenticated = false;
      _user = null;
    }
    return false;
  }

  Future<bool> register({
    required String name,
    required String email,
    required String password,
    required String phone,
    required String role,
  }) async {
    _setLoading(true);
    _setError(null);
    try {
      final result = await _authService.register(
        name: name,
        email: email,
        password: password,
        phone: phone,
        role: role,
      );
      _user = result['user'];
      _devOtpCode = result['otpCode'];
      _setLoading(false);
      return true;
    } catch (e) {
      _setError(e.toString().replaceAll('Exception: ', ''));
      _setLoading(false);
      return false;
    }
  }

  Future<bool> login({
    required String email,
    required String password,
  }) async {
    _setLoading(true);
    _setError(null);
    try {
      final result = await _authService.login(email: email, password: password);
      _user = result['user'];
      _isAuthenticated = true;
      _setLoading(false);
      return true;
    } catch (e) {
      _setError(e.toString().replaceAll('Exception: ', ''));
      _setLoading(false);
      return false;
    }
  }

  Future<bool> verifyOtp({
    required String email,
    required String otpCode,
  }) async {
    _setLoading(true);
    _setError(null);
    try {
      final result = await _authService.verifyOtp(email: email, otpCode: otpCode);
      _user = result['user'];
      _isAuthenticated = true;
      _setLoading(false);
      return true;
    } catch (e) {
      _setError(e.toString().replaceAll('Exception: ', ''));
      _setLoading(false);
      return false;
    }
  }

  Future<bool> googleLogin({
    required String googleId,
    required String email,
    required String name,
    String? avatarUrl,
  }) async {
    _setLoading(true);
    _setError(null);
    try {
      final result = await _authService.googleAuth(
        googleId: googleId,
        email: email,
        name: name,
        avatarUrl: avatarUrl,
      );
      _user = result['user'];
      _isAuthenticated = true;
      _setLoading(false);
      return true;
    } catch (e) {
      _setError(e.toString().replaceAll('Exception: ', ''));
      _setLoading(false);
      return false;
    }
  }

  Future<bool> updateProfile({
    required String name,
    required String phone,
    String? address,
  }) async {
    _setLoading(true);
    try {
      final updated = await _authService.updateProfile(name: name, phone: phone, address: address);
      _user = {...?_user, ...updated};
      _setLoading(false);
      return true;
    } catch (e) {
      _setError(e.toString().replaceAll('Exception: ', ''));
      _setLoading(false);
      return false;
    }
  }

  Future<bool> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    _setLoading(true);
    try {
      await _authService.changePassword(currentPassword: currentPassword, newPassword: newPassword);
      _setLoading(false);
      return true;
    } catch (e) {
      _setError(e.toString().replaceAll('Exception: ', ''));
      _setLoading(false);
      return false;
    }
  }

  Future<void> logout() async {
    await _authService.clearToken();
    _isAuthenticated = false;
    _user = null;
    notifyListeners();
  }
}
