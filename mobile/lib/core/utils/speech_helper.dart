class SpeechHelper {
  /**
   * Simulated speech-to-text dictation helper for hands-free voice input
   */
  static Future<String> listenForSpeech({required Function(String text) onResult}) async {
    // Simulated speech recognition dictation
    await Future.delayed(const Duration(seconds: 2));
    const sampleDictation = 'Deep pothole observed on the right lane causing traffic slowdown.';
    onResult(sampleDictation);
    return sampleDictation;
  }
}
