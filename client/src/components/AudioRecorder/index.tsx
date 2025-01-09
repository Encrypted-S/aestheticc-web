
import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mic, Square, Loader2 } from "lucide-react";

interface Recording {
  id: string;
  url: string;
  blob: Blob;
  isProcessing?: boolean;
  transcription?: string;
}

interface AudioRecorderProps {
  onTranscriptionComplete?: (text: string) => void;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onTranscriptionComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');
  const [recordings, setRecordings] = useState<Recording[]>([]);

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
        const newRecording: Recording = {
          id: Date.now().toString(),
          url: audioUrl,
          blob: audioBlob
        };
        setRecordings(prev => [...prev, newRecording]);
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

  const processAudio = async (recording: Recording) => {
    setRecordings(prev => prev.map(rec => 
      rec.id === recording.id ? { ...rec, isProcessing: true } : rec
    ));

    try {
      const file = new File([recording.blob], 'recording.wav', { type: 'audio/wav' });
      const formData = new FormData();
      formData.append('file', file);
      formData.append('model', 'whisper-1');

      const API_URL = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.host}`;
      const response = await fetch(`${API_URL}/api/transcribe`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to transcribe audio: ${errorText}`);
      }

      const data = await response.json();
      setRecordings(prev => prev.map(rec => 
        rec.id === recording.id ? { ...rec, transcription: data.text } : rec
      ));
      if (onTranscriptionComplete) {
        onTranscriptionComplete(data.text);
      }
    } catch (err) {
      setError('Error processing audio. Please try again.');
      console.error('Error:', err);
    } finally {
      setRecordings(prev => prev.map(rec => 
        rec.id === recording.id ? { ...rec, isProcessing: false } : rec
      ));
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

          {recordings.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium">Recordings</h3>
              {recordings.map((recording) => (
                <div key={recording.id} className="space-y-2">
                  <div className="flex items-center gap-4 p-2 border rounded">
                    <audio src={recording.url} controls className="flex-1" />
                    <Button
                      onClick={() => processAudio(recording)}
                      disabled={recording.isProcessing}
                    >
                      {recording.isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing
                        </>
                      ) : (
                        'Process Audio'
                      )}
                    </Button>
                  </div>
                  {recording.transcription && (
                    <div className="p-2 bg-muted rounded">
                      <p className="text-sm">{recording.transcription}</p>
                    </div>
                  )}
                </div>
              ))}
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
