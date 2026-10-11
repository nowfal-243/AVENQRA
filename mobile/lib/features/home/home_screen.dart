import 'package:flutter/material.dart';
import '../my_complaints/my_complaints_screen.dart';
import '../report_issue/report_issue_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AVENQRA Civic Portal'),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
          tabs: const [
            Tab(icon: Icon(Icons.new_releases, size: 18), text: 'Newly Assigned'),
            Tab(icon: Icon(Icons.timer, size: 18), text: 'Pending (30m SLA)'),
            Tab(icon: Icon(Icons.check_circle, size: 18), text: 'Completed'),
          ],
        ),
      ),
      body: Column(
        children: [
          // Live Camera & 30-Min SLA Banner
          Container(
            padding: const EdgeInsets.all(12),
            margin: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.amber.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.amber.shade300),
            ),
            child: Row(
              children: [
                const Icon(Icons.camera_alt, color: Color(0xFF1E3A8A)),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('📷 Live Camera Capture Only', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF1E3A8A))),
                      Text('Auto-dispatched to nearest municipal officer. Escalates to Highest Authority after 30 mins.', style: TextStyle(fontSize: 11)),
                    ],
                  ),
                ),
                ElevatedButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const ReportIssueScreen()),
                    );
                  },
                  child: const Text('REPORT'),
                ),
              ],
            ),
          ),

          // 3-Column Display Tabs
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                // Column 1: Newly Assigned Tasks
                _buildTaskList('Newly Assigned Tasks', [
                  {'ticket': 'AVN-2026-891023', 'title': 'Pothole on 5th Avenue', 'cat': 'Pothole Detection', 'status': 'ASSIGNED'},
                  {'ticket': 'AVN-2026-441290', 'title': 'Overflowing Trash Bin', 'cat': 'Garbage / Illegal Dumping Detection', 'status': 'SUBMITTED'},
                ], Colors.blue),

                // Column 2: Pending / Escalated Tasks (30-Min SLA)
                _buildTaskList('Pending & Escalated (30-Min SLA)', [
                  {'ticket': 'AVN-2026-992011', 'title': 'Open Manhole Hazard', 'cat': 'Open Manhole Detection', 'status': 'ESCALATED', 'isEscalated': true},
                  {'ticket': 'AVN-2026-102938', 'title': 'Broken Lamp Post #42', 'cat': 'Broken Street-Light Detection', 'status': 'IN_PROGRESS'},
                ], Colors.orange),

                // Column 3: Completed Tasks
                _buildTaskList('Completed Tasks', [
                  {'ticket': 'AVN-2026-302918', 'title': 'Fallen Tree Branch Removed', 'cat': 'Fallen Tree Detection', 'status': 'RESOLVED'},
                ], Colors.green),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTaskList(String header, List<Map<String, dynamic>> items, Color color) {
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final item = items[index];
        final isEscalated = item['isEscalated'] == true;

        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: isEscalated ? Colors.red : color.withOpacity(0.15),
              child: Icon(isEscalated ? Icons.warning_amber : Icons.report_problem, color: isEscalated ? Colors.white : color),
            ),
            title: Text(item['title']!, style: const TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Text('Ticket: ${item['ticket']}\nCategory: ${item['cat']}'),
            trailing: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: isEscalated ? Colors.red : color,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    isEscalated ? 'ESCALATED 🚨' : item['status']!,
                    style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const MyComplaintsScreen()),
              );
            },
          ),
        );
      },
    );
  }
}
