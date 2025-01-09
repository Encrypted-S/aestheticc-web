import { AudioRecorder } from '../components/AudioRecorder';

export default function TestAudio() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Audio Recording Test</h1>
      <AudioRecorder />
    </div>
  );
}