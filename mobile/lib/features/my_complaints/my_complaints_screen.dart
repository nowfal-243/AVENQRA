import 'package:flutter/material.dart';
import '../complaint_details/complaint_details_screen.dart';
import '../report_issue/complaint_provider.dart';

class MyComplaintsScreen extends StatefulWidget {
  final ComplaintProvider? provider;

  const MyComplaintsScreen({super.key, this.provider});

  @override
  State<MyComplaintsScreen> createState() => _MyComplaintsScreenState();
}

class _MyComplaintsScreenState extends State<MyComplaintsScreen> {
  late final ComplaintProvider _provider;
  String _selectedStatusFilter = 'ALL';

  @override
  void initState() {
    super.initState();
    _provider = widget.provider ?? ComplaintProvider();
    _provider.fetchMyComplaints();
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'SUBMITTED':
        return Colors.blue;
      case 'ASSIGNED':
        return Colors.orange;
      case 'IN_PROGRESS':
        return Colors.purple;
      case 'RESOLVED':
        return Colors.green;
      case 'REJECTED':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Complaints'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => _provider.fetchMyComplaints(),
          ),
        ],
      ),
      body: ListenableBuilder(
        listenable: _provider,
        builder: (context, _) {
          if (_provider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          final complaints = _provider.myComplaints;

          return Column(
            children: [
              // Filter Chips
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Row(
                  children: ['ALL', 'SUBMITTED', 'IN_PROGRESS', 'RESOLVED'].map((filter) {
                    final selected = _selectedStatusFilter == filter;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8.0),
                      child: ChoiceChip(
                        label: Text(filter),
                        selected: selected,
                        onSelected: (val) {
                          if (val) {
                            setState(() => _selectedStatusFilter = filter);
                            _provider.fetchMyComplaints(status: filter == 'ALL' ? null : filter);
                          }
                        },
                      ),
                    );
                  }).toList(),
                ),
              ),

              // Complaints List
              Expanded(
                child: complaints.isEmpty
                    ? const Center(
                        child: Text(
                          'No complaints reported yet.',
                          style: TextStyle(color: Colors.grey, fontSize: 16),
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: complaints.length,
                        itemBuilder: (context, index) {
                          final item = complaints[index];
                          final status = item['currentStatus'] ?? 'SUBMITTED';

                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: _getStatusColor(status).withOpacity(0.15),
                                child: Icon(Icons.report_problem, color: _getStatusColor(status)),
                              ),
                              title: Text(
                                item['title'] ?? 'Complaint',
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                              subtitle: Text(
                                'Ticket: ${item['ticketNumber']} • ${item['category']}',
                                style: const TextStyle(fontSize: 12),
                              ),
                              trailing: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: _getStatusColor(status),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      status,
                                      style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  const Icon(Icons.chevron_right, size: 16, color: Colors.grey),
                                ],
                              ),
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => ComplaintDetailsScreen(complaintId: item['id']),
                                  ),
                                );
                              },
                            ),
                          );
                        },
                      ),
              ),
            ],
          );
        },
      ),
    );
  }
}
