import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../constants/app_constants.dart';

class AuthService {
  final _storage = const FlutterSecureStorage();
  static const String _tokenKey = 'avenqra_jwt_token';

  Future<String?> getToken() async {
    return await _storage.read(key: _tokenKey);
  }

  Future<void> saveToken(String token) async {
    await _storage.write(key: _tokenKey, value: token);
  }

  Future<void> clearToken() async {
    await _storage.delete(key: _tokenKey);
  }

  Future<Map<String, dynamic>> register({
    required String name,
    required String email,
    required String password,
    required String phone,
    required String role,
  }) async {
    final response = await http.post(
      Uri.parse('${AppConstants.apiBaseUrl}/auth/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'name': name,
        'email': email,
        'password': password,
        'phone': phone,
        'role': role,
      }),
    );

    final data = jsonDecode(response.body);
    if (response.statusCode == 201 && data['success'] == true) {
      if (data['data']['token'] != null) {
        await saveToken(data['data']['token']);
      }
      return data['data'];
    } else {
      throw Exception(data['message'] ?? 'Registration failed');
    }
  }

  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final response = await http.post(
      Uri.parse('${AppConstants.apiBaseUrl}/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );

    final data = jsonDecode(response.body);
    if (response.statusCode == 200 && data['success'] == true) {
      await saveToken(data['data']['token']);
      return data['data'];
    } else {
      throw Exception(data['message'] ?? 'Login failed');
    }
  }

  Future<Map<String, dynamic>> verifyOtp({
    required String email,
    required String otpCode,
  }) async {
    final response = await http.post(
      Uri.parse('${AppConstants.apiBaseUrl}/auth/verify-otp'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'otpCode': otpCode}),
    );

    final data = jsonDecode(response.body);
    if (response.statusCode == 200 && data['success'] == true) {
      await saveToken(data['data']['token']);
      return data['data'];
    } else {
      throw Exception(data['message'] ?? 'OTP verification failed');
    }
  }

  Future<void> sendOtp(String email) async {
    final response = await http.post(
      Uri.parse('${AppConstants.apiBaseUrl}/auth/send-otp'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email}),
    );

    final data = jsonDecode(response.body);
    if (response.statusCode != 200 || data['success'] != true) {
      throw Exception(data['message'] ?? 'Failed to resend OTP');
    }
  }

  Future<Map<String, dynamic>> googleAuth({
    required String googleId,
    required String email,
    required String name,
    String? avatarUrl,
  }) async {
    final response = await http.post(
      Uri.parse('${AppConstants.apiBaseUrl}/auth/google'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'googleId': googleId,
        'email': email,
        'name': name,
        'avatarUrl': avatarUrl,
      }),
    );

    final data = jsonDecode(response.body);
    if (response.statusCode == 200 && data['success'] == true) {
      await saveToken(data['data']['token']);
      return data['data'];
    } else {
      throw Exception(data['message'] ?? 'Google auth failed');
    }
  }

  Future<Map<String, dynamic>> getProfile() async {
    final token = await getToken();
    final response = await http.get(
      Uri.parse('${AppConstants.apiBaseUrl}/user/profile'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    final data = jsonDecode(response.body);
    if (response.statusCode == 200 && data['success'] == true) {
      return data['data'];
    } else {
      throw Exception(data['message'] ?? 'Failed to fetch profile');
    }
  }

  Future<Map<String, dynamic>> updateProfile({
    required String name,
    required String phone,
    String? address,
  }) async {
    final token = await getToken();
    final response = await http.put(
      Uri.parse('${AppConstants.apiBaseUrl}/user/profile'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'name': name,
        'phone': phone,
        'address': address,
      }),
    );

    final data = jsonDecode(response.body);
    if (response.statusCode == 200 && data['success'] == true) {
      return data['data'];
    } else {
      throw Exception(data['message'] ?? 'Failed to update profile');
    }
  }

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    final token = await getToken();
    final response = await http.post(
      Uri.parse('${AppConstants.apiBaseUrl}/user/change-password'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'currentPassword': currentPassword,
        'newPassword': newPassword,
      }),
    );

    final data = jsonDecode(response.body);
    if (response.statusCode != 200 || data['success'] != true) {
      throw Exception(data['message'] ?? 'Failed to change password');
    }
  }
}
