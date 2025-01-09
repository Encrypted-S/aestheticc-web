import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mic, Square, Loader2 } from "lucide-react";

interface AudioRecorderProps {
  onTranscriptionComplete?: (text: string) => void;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onTranscriptionComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');
  const [audioURL, setAudioURL] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioURL(audioUrl);
        processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError('');
    } catch (err) {
      setError('Could not access microphone. Please ensure you have granted permission.');
      console.error('Error accessing media devices:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      // Convert blob to file
      const file = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });

      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('model', 'whisper-1');

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5173';
      const response = await fetch(`${API_URL}/api/transcribe`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to transcribe audio');
      }

      const data = await response.json();

      if (onTranscriptionComplete) {
        onTranscriptionComplete(data.text);
      }

      setIsProcessing(false);
    } catch (err) {
      setError('Error processing audio. Please try again.');
      setIsProcessing(false);
      console.error('Error:', err);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Record Your Content</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-center gap-4">
            {!isRecording ? (
              <Button 
                onClick={startRecording}
                className="flex items-center gap-2"
              >
                <Mic className="w-4 h-4" />
                Start Recording
              </Button>
            ) : (
              <Button 
                onClick={stopRecording} 
                variant="destructive"
                className="flex items-center gap-2"
              >
                <Square className="w-4 h-4" />
                Stop Recording
              </Button>
            )}
          </div>

          {isProcessing && (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Processing audio...</span>
            </div>
          )}

          {audioURL && (
            <div className="mt-4">
              <audio src={audioURL} controls className="w-full" />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AudioRecorder;