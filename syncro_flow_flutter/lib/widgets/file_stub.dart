// Stub for web: provides dummy File when dart:io is unavailable.
// Used via conditional import: import 'file_stub.dart' if (dart.library.io) 'dart:io'
class File {
  final String path;
  File(this.path);
  Future<List<int>> readAsBytes() async => [];
  List<int> readAsBytesSync() => [];
}
