class AppConstants {
  static const String appName = 'AVENQRA';
  static const String apiBaseUrl = 'http://10.0.2.2:5000/api/v1'; // Default for Android emulator
  
  // 15 Civic Issue Categories
  //
  // These labels MUST stay identical to `CATEGORIES` in
  // web/src/utils/constants.js — that list is the platform-wide source of
  // truth. The backend routes a complaint to a municipal department by
  // keyword-matching these strings, so renaming one here silently changes
  // which department receives the report.
  static const List<String> issueCategories = [
    'Pothole',
    'Damaged Road',
    'Waste Accumulation',
    'Drainage Blockage',
    'Water Leakage',
    'Streetlight Electrical Failure',
    'Overflowing Waste Bin',
    'Sewage Overflow',
    'Damaged Footpath',
    'Traffic Signal Failure (Electrical)',
    'Illegal Waste Dumping',
    'Water Supply Interruption',
    'Public Property Damage',
    'Fallen Tree',
    'Other Civic Issue'
  ];
}
