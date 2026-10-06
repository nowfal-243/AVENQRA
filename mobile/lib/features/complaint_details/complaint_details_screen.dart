import 'package:flutter/material.dart';
import '../../core/services/complaint_service.dart';

class ComplaintDetailsScreen extends StatefulWidget {
  final String complaintId;

  const ComplaintDetailsScreen({super.key, required this.complaintId});

  @override
  State<ComplaintDetailsScreen> createState() => _ComplaintDetailsScreenState();
}

class _ComplaintDetailsScreenState extends State<ComplaintDetailsScreen> {
  final ComplaintService _service = ComplaintService();
  bool _isLoading = true;
  Map<String, dynamic>? _complaint;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadDetails();
  }

  void _loadDetails() async {
    try {
      final details = await _service.getComplaintById(widget.complaintId);
      if (mounted) {
        setState(() {
          _complaint = details;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString().replaceAll('Exception: ', '');
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Complaint Details')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_error != null || _complaint == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Complaint Details')),
        body: Center(child: Text(_error ?? 'Complaint not found')),
      );
    }

    final ticket = _complaint!['ticketNumber'] ?? '';
    final title = _complaint!['title'] ?? 'Complaint';
    final description = _complaint!['description'] ?? '';
    final category = _complaint!['category'] ?? '';
    final status = _complaint!['currentStatus'] ?? 'SUBMITTED';
    final location = _complaint!['location'] ?? {};
    final aiAnalysis = _complaint!['aiAnalysis'];
    final images = (_complaint!['images'] as List?) ?? [];

    return Scaffold(
      appBar: AppBar(
        title: Text(ticket),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Media Image Thumbnail Container
            Container(
              height: 200,
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.grey.shade200,
                borderRadius: BorderRadius.circular(12),
                image: images.isNotEmpty && images[0]['imageUrl'] != null
                    ? DecorationImage(
                        image: NetworkImage(images[0]['imageUrl']),
                        fit: BoxFit.cover,
                      )
                    : null,
              ),
              child: images.isEmpty
                  ? const Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.image_not_supported, size: 48, color: Colors.grey),
                          Text('No Image Uploaded', style: TextStyle(color: Colors.grey)),
                        ],
                      ),
                    )
                  : null,
            ),
            const SizedBox(height: 16),

            // Header Status & Title
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Chip(
                  label: Text(category, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  backgroundColor: const Color(0xFF1E3A8A),
                ),
                Chip(
                  label: Text(status, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  backgroundColor: status == 'RESOLVED' ? Colors.green : Colors.orange,
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(title, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(description, style: const TextStyle(fontSize: 15, color: Colors.black87)),
            const SizedBox(height: 20),

            // Location Card
            Card(
              child: ListTile(
                leading: const Icon(Icons.location_on, color: Colors.red),
                title: const Text('GPS Location'),
                subtitle: Text(location['addressFormatted'] ?? 'Coordinates: ${location['latitude']}, ${location['longitude']}'),
              ),
            ),

            // AI Analysis Evaluation Card (if available)
            if (aiAnalysis != null) ...[
              const SizedBox(height: 12),
              Card(
                color: Colors.blue.shade50,
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.auto_awesome, color: Color(0xFF1E3A8A)),
                          SizedBox(width: 8),
                          Text('AI Computer Vision Evaluation', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text('• Detected Category: ${aiAnalysis['predictedCategory'] ?? category}'),
                      Text('• Model Confidence: ${((aiAnalysis['confidenceScore'] ?? 0.9) * 100).toStringAsFixed(1)}%'),
                      Text('• Severity Score: ${aiAnalysis['severityScore'] ?? 5.0} / 10.0'),
                      Text('• Duplicate Report: ${aiAnalysis['isDuplicate'] == true ? 'YES (Linked)' : 'No Duplicates Detected'}'),
                    ],
                  ),
                ),
              ),
            ],

            const SizedBox(height: 24),
            const Text('Resolution Stage Timeline', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            _buildTimelineTile('SUBMITTED', 'Complaint registered by Citizen', status != 'REJECTED'),
            _buildTimelineTile('ASSIGNED', 'Assigned to Municipal Officer', status == 'ASSIGNED' || status == 'IN_PROGRESS' || status == 'RESOLVED'),
            _buildTimelineTile('IN_PROGRESS', 'Officer dispatched to location', status == 'IN_PROGRESS' || status == 'RESOLVED'),
            _buildTimelineTile('RESOLVED', 'Issue resolved & verified', status == 'RESOLVED'),
          ],
        ),
      ),
    );
  }

  Widget _buildTimelineTile(String title, String subtitle, bool isCompleted) {
    return ListTile(
      leading: Icon(
        isCompleted ? Icons.check_circle : Icons.radio_button_unchecked,
        color: isCompleted ? Colors.green : Colors.grey,
      ),
      title: Text(title, style: TextStyle(fontWeight: isCompleted ? FontWeight.bold : FontWeight.normal)),
      subtitle: Text(subtitle, style: const TextStyle(fontSize: 12)),
    );
  }
}
