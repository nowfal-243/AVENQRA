import 'dart:io';
import 'package:flutter/material.dart';
import '../../core/constants/app_constants.dart';
import '../../core/utils/speech_helper.dart';
import 'complaint_provider.dart';

class ReportIssueScreen extends StatefulWidget {
  final ComplaintProvider? complaintProvider;

  const ReportIssueScreen({super.key, this.complaintProvider});

  @override
  State<ReportIssueScreen> createState() => _ReportIssueScreenState();
}

class _ReportIssueScreenState extends State<ReportIssueScreen> {
  late final ComplaintProvider _provider;
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  String _selectedCategory = AppConstants.issueCategories.first;

  @override
  void initState() {
    super.initState();
    _provider = widget.complaintProvider ?? ComplaintProvider();
    _provider.fetchLocation();
  }

  void _handleSpeechInput() async {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Listening... Dictate your issue description now.')),
    );
    await SpeechHelper.listenForSpeech(onResult: (text) {
      if (mounted) {
        setState(() {
          _descController.text = text;
        });
      }
    });
  }

  void _handleSubmit() async {
    if (_formKey.currentState!.validate()) {
      final success = await _provider.submitComplaint(
        title: _titleController.text.trim(),
        description: _descController.text.trim(),
        category: _selectedCategory,
      );

      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Complaint submitted successfully! Ticket number generated.'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context);
      } else if (mounted && _provider.errorMessage != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(_provider.errorMessage!),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Report Civic Issue'),
      ),
      body: ListenableBuilder(
        listenable: _provider,
        builder: (context, _) {
          final location = _provider.currentLocation;

          return SingleChildScrollView(
            padding: const EdgeInsets.all(20.0),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Image / Video Capture Preview Container
                  GestureDetector(
                    onTap: () {
                      // Simulated image capture for preview
                      _provider.setSelectedMedia(File('/simulated/photo_pothole.jpg'));
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Photo captured via camera preview.')),
                      );
                    },
                    child: Container(
                      height: 180,
                      decoration: BoxDecoration(
                        color: Colors.blue.shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFF1E3A8A), width: 1.5),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            _provider.selectedMedia != null ? Icons.check_circle : Icons.camera_alt,
                            size: 48,
                            color: const Color(0xFF1E3A8A),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _provider.selectedMedia != null
                                ? 'Photo Captured (Tap to Retake)'
                                : 'Tap to Capture Photo / Video',
                            style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF1E3A8A)),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // GPS Location Auto-detect Card
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.grey.shade300),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.my_location, color: Color(0xFF1E3A8A)),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('GPS Geolocation', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                              Text(
                                _provider.isFetchingLocation
                                    ? 'Acquiring GPS coordinates...'
                                    : (location?.address ?? 'Location acquired'),
                                style: const TextStyle(fontSize: 13),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.refresh),
                          onPressed: _provider.fetchLocation,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Category Selector Dropdown
                  DropdownButtonFormField<String>(
                    value: _selectedCategory,
                    decoration: const InputDecoration(
                      labelText: 'Issue Category',
                      prefixIcon: Icon(Icons.category_outlined),
                      border: OutlineInputBorder(),
                    ),
                    items: AppConstants.issueCategories.map((cat) {
                      return DropdownMenuItem(value: cat, child: Text(cat));
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) setState(() => _selectedCategory = val);
                    },
                  ),
                  const SizedBox(height: 16),

                  // Title Input
                  TextFormField(
                    controller: _titleController,
                    decoration: const InputDecoration(
                      labelText: 'Complaint Title',
                      prefixIcon: Icon(Icons.title_outlined),
                      border: OutlineInputBorder(),
                    ),
                    validator: (val) => val == null || val.isEmpty ? 'Title is required' : null,
                  ),
                  const SizedBox(height: 16),

                  // Description Input with Voice Dictation Button
                  TextFormField(
                    controller: _descController,
                    maxLines: 3,
                    decoration: InputDecoration(
                      labelText: 'Detailed Description',
                      prefixIcon: const Icon(Icons.description_outlined),
                      suffixIcon: IconButton(
                        icon: const Icon(Icons.mic, color: Color(0xFF1E3A8A)),
                        onPressed: _handleSpeechInput,
                        tooltip: 'Voice Input Dictation',
                      ),
                      border: const OutlineInputBorder(),
                    ),
                    validator: (val) => val == null || val.isEmpty ? 'Description is required' : null,
                  ),
                  const SizedBox(height: 24),

                  // Submit Button
                  ElevatedButton(
                    onPressed: _provider.isLoading ? null : _handleSubmit,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: _provider.isLoading
                        ? const CircularProgressIndicator(color: Colors.white)
                        : const Text('SUBMIT COMPLAINT', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
