import 'dart:io';
import 'package:flutter/material.dart';
import '../../core/services/complaint_service.dart';
import '../../core/utils/location_helper.dart';

class ComplaintProvider extends ChangeNotifier {
  final ComplaintService _service = ComplaintService();

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  bool _isFetchingLocation = false;
  bool get isFetchingLocation => _isFetchingLocation;

  bool _isListeningSpeech = false;
  bool get isListeningSpeech => _isListeningSpeech;

  String? _errorMessage;
  String? get errorMessage => _errorMessage;

  LocationData? _currentLocation;
  LocationData? get currentLocation => _currentLocation;

  File? _selectedMedia;
  File? get selectedMedia => _selectedMedia;

  List<dynamic> _myComplaints = [];
  List<dynamic> get myComplaints => _myComplaints;

  void setSelectedMedia(File? file) {
    _selectedMedia = file;
    notifyListeners();
  }

  Future<void> fetchLocation() async {
    _isFetchingLocation = true;
    notifyListeners();
    try {
      _currentLocation = await LocationHelper.getCurrentLocation();
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
    } finally {
      _isFetchingLocation = false;
      notifyListeners();
    }
  }

  Future<bool> submitComplaint({
    required String title,
    required String description,
    required String category,
  }) async {
    if (_currentLocation == null) {
      await fetchLocation();
    }

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await _service.createComplaint(
        title: title,
        description: description,
        category: category,
        latitude: _currentLocation?.latitude ?? 12.9716,
        longitude: _currentLocation?.longitude ?? 77.5946,
        address: _currentLocation?.address ?? '123 Main Street',
        mediaFile: _selectedMedia,
      );
      _selectedMedia = null;
      _isLoading = false;
      notifyListeners();
      await fetchMyComplaints();
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> fetchMyComplaints({String? status}) async {
    _isLoading = true;
    notifyListeners();
    try {
      _myComplaints = await _service.getMyComplaints(status: status);
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
