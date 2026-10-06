import 'package:flutter/material.dart';
import '../auth/auth_provider.dart';

class ProfileScreen extends StatefulWidget {
  final AuthProvider authProvider;
  final VoidCallback onLogout;

  const ProfileScreen({
    super.key,
    required this.authProvider,
    required this.onLogout,
  });

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  void _showEditProfileDialog() {
    final user = widget.authProvider.user ?? {};
    final nameController = TextEditingController(text: user['name'] ?? '');
    final phoneController = TextEditingController(text: user['phone'] ?? '');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Edit Profile'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameController,
              decoration: const InputDecoration(labelText: 'Full Name'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: phoneController,
              decoration: const InputDecoration(labelText: 'Phone Number'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final success = await widget.authProvider.updateProfile(
                name: nameController.text.trim(),
                phone: phoneController.text.trim(),
              );
              if (success && mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Profile updated successfully!')),
                );
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _showChangePasswordDialog() {
    final currentPassController = TextEditingController();
    final newPassController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Change Password'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: currentPassController,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Current Password'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: newPassController,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'New Password'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final success = await widget.authProvider.changePassword(
                currentPassword: currentPassController.text,
                newPassword: newPassController.text,
              );
              if (success && mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Password changed successfully!')),
                );
              } else if (mounted && widget.authProvider.errorMessage != null) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(widget.authProvider.errorMessage!), backgroundColor: Colors.red),
                );
              }
            },
            child: const Text('Update'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = widget.authProvider.user ?? {};
    final role = user['role'] ?? 'CITIZEN';

    return Scaffold(
      appBar: AppBar(
        title: const Text('User Profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await widget.authProvider.logout();
              widget.onLogout();
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          children: [
            CircleAvatar(
              radius: 44,
              backgroundColor: const Color(0xFF1E3A8A),
              child: Text(
                (user['name'] ?? 'U')[0].toUpperCase(),
                style: const TextStyle(fontSize: 36, color: Colors.white, fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              user['name'] ?? 'User Profile',
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            Text(
              user['email'] ?? '',
              style: const TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 8),
            Chip(
              avatar: const Icon(Icons.shield, size: 16, color: Colors.white),
              label: Text(
                role,
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
              ),
              backgroundColor: role == 'OFFICER' ? Colors.purple : const Color(0xFF1E3A8A),
            ),
            const SizedBox(height: 24),
            Card(
              child: ListTile(
                leading: const Icon(Icons.phone),
                title: const Text('Phone Number'),
                subtitle: Text(user['phone'] ?? 'Not set'),
                trailing: const Icon(Icons.edit, size: 18),
                onTap: _showEditProfileDialog,
              ),
            ),
            Card(
              child: ListTile(
                leading: const Icon(Icons.verified_user),
                title: const Text('Account Status'),
                subtitle: Text(user['isVerified'] == true ? 'Verified Account' : 'Unverified'),
                trailing: Icon(
                  user['isVerified'] == true ? Icons.check_circle : Icons.warning,
                  color: user['isVerified'] == true ? Colors.green : Colors.orange,
                ),
              ),
            ),
            Card(
              child: ListTile(
                leading: const Icon(Icons.lock_reset),
                title: const Text('Security & Password'),
                subtitle: const Text('Change your password'),
                trailing: const Icon(Icons.chevron_right),
                onTap: _showChangePasswordDialog,
              ),
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () async {
                  await widget.authProvider.logout();
                  widget.onLogout();
                },
                icon: const Icon(Icons.logout, color: Colors.red),
                label: const Text('LOG OUT', style: TextStyle(color: Colors.red)),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Colors.red),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
