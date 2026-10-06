import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../constants/app_constants.dart';
import 'auth_service.dart';

class ComplaintService {
  final AuthService _authService = AuthService();

  Future<Map<String, dynamic>> createComplaint({
    required String title,
    required String description,
    required String category,
    required double latitude,
    required double longitude,
    required String address,
    File? mediaFile,
  }) async {
    final token = await _authService.getToken();
    final uri = Uri.parse('${AppConstants.apiBaseUrl}/complaints');

    final request = http.MultipartRequest('POST', uri);
    request.headers['Authorization'] = 'Bearer $token';

    request.fields['title'] = title;
    request.fields['description'] = description;
    request.fields['category'] = category;
    request.fields['latitude'] = latitude.toString();
    request.fields['longitude'] = longitude.toString();
    request.fields['address'] = address;

    if (mediaFile != null && await mediaFile.exists()) {
      request.files.add(
        await http.MultipartFile.fromPath('media', mediaFile.path),
      );
    }

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);
    final data = jsonDecode(response.body);

    if (response.statusCode == 201 && data['success'] == true) {
      return data['data'];
    } else {
      throw Exception(data['message'] ?? 'Failed to submit complaint');
    }
  }

  Future<List<dynamic>> getMyComplaints({String? status, String? category}) async {
    final token = await _authService.getToken();
    var url = '${AppConstants.apiBaseUrl}/complaints/my?limit=50';
    if (status != null && status.isNotEmpty) url += '&status=$status';
    if (category != null && category.isNotEmpty) url += '&category=$category';

    final response = await http.get(
      Uri.parse(url),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    final data = jsonDecode(response.body);
    if (response.statusCode == 200 && data['success'] == true) {
      return data['data'];
    } else {
      throw Exception(data['message'] ?? 'Failed to fetch complaints');
    }
  }

  Future<Map<String, dynamic>> getComplaintById(String id) async {
    final token = await _authService.getToken();
    final response = await http.get(
      Uri.parse('${AppConstants.apiBaseUrl}/complaints/$id'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    final data = jsonDecode(response.body);
    if (response.statusCode == 200 && data['success'] == true) {
      return data['data'];
    } else {
      throw Exception(data['message'] ?? 'Failed to fetch complaint details');
    }
  }
}
