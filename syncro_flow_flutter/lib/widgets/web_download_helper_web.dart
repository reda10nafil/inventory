// ignore: avoid_web_libraries_in_flutter
import 'dart:convert';
import 'dart:html' as html;

Future<void> downloadJsonWeb(String jsonString, String filename) async {
  final bytes = utf8.encode(jsonString);
  final blob = html.Blob([bytes], 'application/json');
  final url = html.Url.createObjectUrlFromBlob(blob);
  html.AnchorElement(href: url)
    ..setAttribute('download', filename)
    ..click();
  html.Url.revokeObjectUrl(url);
}
