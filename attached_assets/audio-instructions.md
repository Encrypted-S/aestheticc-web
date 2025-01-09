# Audio Recording Feature Implementation Guide

## Overview
This guide details how to add audio recording functionality to the aesthetic clinic content generation app. The feature allows users to record audio which is then transcribed using OpenAI's Whisper API and can be used to generate social media content.

## Component Setup

### 1. Create AudioRecorder Component Directory
```bash
mkdir src/components/AudioRecorder
touch src/components/AudioRecorder/index.tsx
```

### 2. AudioRecorder Component Code
Create file: `src/components/AudioRecorder/index.tsx`

```typescript
import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mic, Square, Loader2 } from "lucide-react";

const AudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');
  const [audioURL, setAudioURL] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioURL(audioUrl);
        processAudio(audioBlob);
      };

      mediaRecorderRef.current.start();
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
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob) => {
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
      
      // Here you can emit the transcribed text to a parent component
      // or process it further as needed
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
```

## Server-Side Setup

### 1. Install Required Dependencies
```bash
npm install multer
npm install --save-dev @types/multer
```

### 2. Create Transcribe Route
Create a new file for the transcribe route handler. Add this code to your server routes:

```typescript
import multer from 'multer';
import { Router } from 'express';

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB limit
  }
});

export const transcribeRouter = Router();

transcribeRouter.post('/transcribe', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided' });
  }

  try {
    // Create form data for OpenAI
    const formData = new FormData();
    formData.append('file', new Blob([req.file.buffer], { type: req.file.mimetype }));
    formData.append('model', 'whisper-1');

    // Send to OpenAI
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to transcribe audio');
    }

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Failed to process audio' });
  }
});
```

### 3. Register the Route
In your `server/routes.ts`, add:

```typescript
import { transcribeRouter } from './routes/transcribe';

export function registerRoutes(app: Express) {
  // Your existing routes...
  app.use('/api', transcribeRouter);
}
```

### 4. Environment Setup
Add to your `.env` file:
```bash
OPENAI_API_KEY=your_key_here
VITE_API_URL=http://localhost:5173  # for development
```

## Testing

Create a test page to verify the implementation:

```typescript
// src/pages/test-audio.tsx
import { AudioRecorder } from '../components/AudioRecorder';

export default function TestAudio() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Audio Recording Test</h1>
      <AudioRecorder />
    </div>
  );
}
```

## Notes
- Browser will handle microphone permissions automatically
- Whisper API costs $0.006 per minute of audio
- Make sure audio files are under 25MB
- Remember to protect the /api/transcribe endpoint if needed to match your authentication setup
