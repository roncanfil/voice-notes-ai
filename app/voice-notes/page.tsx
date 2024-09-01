"use client";

import React, { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Loader2, Mic, Square, SendHorizontal } from "lucide-react";
import {
  transcribeAudio,
  chatWithAI,
  saveRecording,
  getRecordings,
  updateRecordingTranscription,
  saveChatMessage,
  getChatMessages,
} from "@/lib/actions";
import { AudioPlayer } from "@/components/custom/AudioPlayer";

interface Recording {
  id: string;
  duration: string;
  timestamp: Date;
  audioKey: string;
  audioUrl: string | "";
  transcription: string | null;
}

interface ChatMessage {
  id: string;
  recordingId: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function VoiceNotesAI() {
  const [isLoading, setIsLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(
    null
  );
  const [isRecording, setIsRecording] = useState(false);
  const [isSavingRecording, setIsSavingRecording] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const [newMessage, setNewMessage] = useState("");
  const [showTranscription, setShowTranscription] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    fetchRecordings();
    initializeMediaRecorder();
  }, []);

  useEffect(() => {
    if (selectedRecording) {
      fetchChatMessages(selectedRecording.id);
      setShowTranscription(!!selectedRecording.transcription);
    }
  }, [selectedRecording]);

  useEffect(() => {
    return () => {
      recordings.forEach((recording) => {
        if (recording.audioUrl.startsWith("blob:")) {
          URL.revokeObjectURL(recording.audioUrl);
        }
      });
    };
  }, [recordings]);

  const initializeMediaRecorder = async () => {
    if (typeof window !== "undefined") {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        mediaRecorderRef.current = new MediaRecorder(stream);
      } catch (err) {
        console.error("Error accessing microphone:", err);
      }
    }
  };

  const fetchRecordings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedRecordings = await getRecordings();
      const formattedRecordings: Recording[] = fetchedRecordings.map(
        (recording) => ({
          ...recording,
          timestamp: new Date(recording.timestamp),
          transcription: recording.transcription || null,
          audioUrl: recording.audioUrl || null,
        })
      );
      setRecordings(formattedRecordings);
    } catch (error) {
      console.error("Error fetching recordings:", error);
      setError("Failed to fetch recordings. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = () => {
    if (mediaRecorderRef.current) {
      setIsRecording(true);
      recordingStartTimeRef.current = Date.now();
      mediaRecorderRef.current.start();
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      setIsRecording(false);
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.ondataavailable = handleRecordingData;
    }
  };

  const handleRecordingData = async (event: BlobEvent) => {
    setIsSavingRecording(true);
    const audioBlob = new Blob([event.data], { type: "audio/wav" });
    const duration = calculateDuration();

    try {
      // Generate a temporary URL for immediate use
      const tempAudioUrl = URL.createObjectURL(audioBlob);

      // Convert Blob to base64
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      // Remove the data URL prefix (e.g., "data:audio/wav;base64,")
      const base64Data = base64Audio.split(",")[1];

      const savedRecording = await saveRecording(base64Data, duration);

      const newRecording: Recording = {
        id: savedRecording.id,
        duration: savedRecording.duration,
        timestamp: new Date(savedRecording.timestamp),
        audioKey: savedRecording.audioKey || "",
        audioUrl: tempAudioUrl, // Use the temporary URL
        transcription: savedRecording.transcription || null,
      };

      setRecordings((prevRecordings) => [newRecording, ...prevRecordings]);
      setSelectedRecording(newRecording);
    } catch (error) {
      console.error("Error saving recording:", error);
      setError(`Failed to save recording: ${error.message}`);
    } finally {
      setIsSavingRecording(false);
    }
  };

  const calculateDuration = () => {
    if (recordingStartTimeRef.current) {
      const duration = Date.now() - recordingStartTimeRef.current;
      const seconds = Math.floor(duration / 1000);
      const minutes = Math.floor(seconds / 60);
      return `${minutes}:${(seconds % 60).toString().padStart(2, "0")}`;
    }
    return "0:00";
  };

  async function handleTranscribeAudio(recordingId: string) {
    const recording = recordings.find((r) => r.id === recordingId);
    if (recording) {
      try {
        setIsTranscribing(true);
        setShowTranscription(true);
        setError(null);

        const audioResponse = await fetch(recording.audioUrl);
        if (!audioResponse.ok) {
          throw new Error(`Failed to fetch audio: ${audioResponse.statusText}`);
        }
        const audioBlob = await audioResponse.blob();

        const base64Audio = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(audioBlob);
        });

        // Remove the data URL prefix (e.g., "data:audio/mp3;base64,")
        const base64Data = base64Audio.split(",")[1];

        const transcription = await transcribeAudio(base64Data);

        const updatedRecordings = recordings.map((r) =>
          r.id === recordingId ? { ...r, transcription } : r
        );
        setRecordings(updatedRecordings);

        if (selectedRecording && selectedRecording.id === recordingId) {
          setSelectedRecording({ ...selectedRecording, transcription });
        }

        await updateRecordingTranscription(recordingId, transcription);
      } catch (error) {
        console.error("Transcription error:", error);
        setError("Failed to transcribe audio. Please try again.");
      } finally {
        setIsTranscribing(false);
      }
    }
  }

  const fetchChatMessages = async (recordingId: string) => {
    try {
      const messages = await getChatMessages(recordingId);
      setChatMessages(messages);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      setError("Failed to fetch chat messages. Please try again later.");
    }
  };

  async function handleAskAI() {
    if (selectedRecording?.transcription && newMessage.trim()) {
      try {
        setIsChatLoading(true);
        const userMessage: ChatMessage = {
          id: Date.now().toString(),
          recordingId: selectedRecording.id,
          role: "user",
          content: newMessage,
          timestamp: new Date(),
        };

        setChatMessages((prev) => [...prev, userMessage]);
        setNewMessage("");

        const savedUserMessage = await saveChatMessage(userMessage);

        setChatMessages((prev) =>
          prev.map((msg) =>
            msg.id === userMessage.id ? savedUserMessage : msg
          )
        );

        const updatedChatMessages = [...chatMessages, savedUserMessage];

        const reply = await chatWithAI(
          updatedChatMessages.map(({ role, content }) => ({ role, content })),
          selectedRecording.transcription
        );

        const assistantMessage: ChatMessage = {
          id: "",
          recordingId: selectedRecording.id,
          role: "assistant",
          content: reply,
          timestamp: new Date(),
        };

        const savedAssistantMessage = await saveChatMessage(assistantMessage);

        setChatMessages((prev) => [...prev, savedAssistantMessage]);
      } catch (error) {
        console.error("Error in chatWithAI:", error);
        setError("Failed to get AI response. Please try again.");
      } finally {
        setIsChatLoading(false);
      }
    }
  }

  const filteredRecordings = recordings.filter((recording) =>
    recording.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleKeyPress = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleAskAI();
    }
  };

  return (
    <div className="container mx-auto p-4">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Voice Notes AI</h1>
        <div className="flex gap-2">
          <Button
            onClick={startRecording}
            disabled={isRecording}
            className={isRecording ? "bg-red-500 hover:bg-red-600" : ""}
          >
            <Mic className="h-4 w-4 mr-2" />
            {isRecording ? "Recording" : "Record"}
          </Button>
          <Button onClick={stopRecording} disabled={!isRecording}>
            <Square className="h-4 w-4 mr-2" />
            Stop Recording
          </Button>
        </div>
      </header>

      {isSavingRecording && (
        <Card className="mb-6">
          <CardContent className="p-4 flex items-center justify-center">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />

            <span>Saving new recording...</span>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Input
            type="search"
            placeholder="Search recordings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-4"
          />
          <ScrollArea className="h-[calc(100vh-150px)]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="spinner mr-2"></div>
                <p>Loading recordings...</p>
              </div>
            ) : (
              filteredRecordings.map((recording) => (
                <Card
                  key={recording.id}
                  className={`mb-2 cursor-pointer ${
                    selectedRecording?.id === recording.id ? "bg-gray-100" : ""
                  }`}
                  onClick={() => setSelectedRecording(recording)}
                >
                  <CardContent className="p-4">
                    <h3 className="font-semibold">Recording {recording.id}</h3>
                    <p className="text-sm text-muted-foreground">
                      {recording.duration} •{" "}
                      {new Date(recording.timestamp).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </ScrollArea>
        </div>

        <div>
          {selectedRecording && (
            <>
              <Card className="mb-4">
                <CardContent className="p-4">
                  <h2 className="text-xl font-semibold mb-2">
                    Recording {selectedRecording.id}
                  </h2>
                  <AudioPlayer
                    audioUrl={selectedRecording.audioUrl}
                    onTranscribe={() =>
                      handleTranscribeAudio(selectedRecording.id)
                    }
                  />
                </CardContent>
              </Card>

              {showTranscription && (
                <Card className="mb-4">
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2">Transcription</h3>
                    {isTranscribing ? (
                      <div className="flex items-center justify-center">
                        <div className="spinner"></div>
                        <span className="ml-2">Transcribing...</span>
                      </div>
                    ) : selectedRecording.transcription ? (
                      <p>{selectedRecording.transcription}</p>
                    ) : null}
                  </CardContent>
                </Card>
              )}
              {selectedRecording.transcription && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2">AI Chat</h3>
                    <div
                      ref={chatContainerRef}
                      className="flex flex-col space-y-4 p-4 h-64 overflow-y-auto"
                    >
                      {chatMessages.map((message) => (
                        <div
                          key={message.id}
                          className={cn(
                            "max-w-[70%] p-3 rounded-lg",
                            message.role === "user"
                              ? "self-end bg-blue-500 text-white"
                              : "self-start bg-gray-200 text-gray-800"
                          )}
                        >
                          <p>{message.content}</p>
                        </div>
                      ))}
                      {isChatLoading && (
                        <div className="self-start bg-gray-200 text-gray-800 max-w-[70%] p-3 rounded-lg">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2 p-4">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Type your message..."
                        className="flex-grow p-2 border rounded"
                      />
                      <Button
                        onClick={handleAskAI}
                        disabled={isChatLoading || !newMessage.trim()}
                      >
                        <SendHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
