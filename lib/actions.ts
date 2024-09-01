"use server";

import prisma from "@/lib/prisma";
import fetch from "node-fetch";
import FormData from "form-data";
import { uploadToS3, getSignedUrl } from "@/lib/s3";

export async function transcribeAudio(base64Audio: string) {
  try {
    const audioBuffer = Buffer.from(base64Audio, "base64");
    const formData = new FormData();
    formData.append("file", audioBuffer, {
      filename: "audio.mp3",
      contentType: "audio/mpeg",
    });
    formData.append("model", "whisper-large-v3");
    formData.append("temperature", "0");
    formData.append("response_format", "json");

    const response = await fetch(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          ...formData.getHeaders(),
        },
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(`Transcription failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("Transcription error:", error);
    throw new Error("Failed to transcribe audio. Please try again later.");
  }
}

export async function chatWithAI(
  chatHistory: { role: string; content: string }[],
  transcription: string
) {
  const apiKey = process.env.GPT4_MINI_API_KEY;
  const apiUrl = "https://api.openai.com/v1/chat/completions";

  const messages = [
    {
      role: "system",
      content: `You are an AI assistant. Your task is to answer questions and have a conversation based on the following transcription: "${transcription}"`,
    },
    ...chatHistory,
  ];

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messages,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `API request failed with status ${response.status}: ${JSON.stringify(
          errorData
        )}`
      );
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error in chatWithAI:", error);
    throw error;
  }
}

export async function saveRecording(base64AudioData: string, duration: string) {
  try {
    const buffer = Buffer.from(base64AudioData, "base64");
    const fileName = `recording_${Date.now()}.wav`;

    const uploadSuccess = await uploadToS3(buffer, fileName);
    if (!uploadSuccess) {
      throw new Error("Failed to upload audio to S3");
    }

    const recording = await prisma.recording.create({
      data: {
        audioKey: fileName,
        duration: duration,
      },
    });

    return recording;
  } catch (error) {
    console.error("Error saving recording:", error);
    throw error;
  }
}

export async function getRecordings() {
  const recordings = await prisma.recording.findMany({
    orderBy: { timestamp: "desc" },
  });

  const recordingsWithUrls = await Promise.all(
    recordings.map(async (recording) => ({
      ...recording,
      audioUrl: await getAudioUrl(recording.audioKey),
    }))
  );

  return recordingsWithUrls;
}

export async function updateRecordingTranscription(
  recordingId: string,
  transcription: string
) {
  try {
    await prisma.recording.update({
      where: { id: recordingId },
      data: { transcription },
    });
  } catch (error) {
    console.error("Error updating transcription:", error);
    throw new Error("Failed to update transcription in the database");
  }
}

export async function saveChatMessage(message: {
  recordingId: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}): Promise<ChatMessage> {
  const { recordingId, role, content, timestamp } = message;
  const savedMessage = await prisma.chat.create({
    data: {
      recordingId,
      role,
      content,
      timestamp,
    },
  });
  return {
    id: savedMessage.id,
    recordingId: savedMessage.recordingId,
    role: savedMessage.role as "user" | "assistant",
    content: savedMessage.content,
    timestamp: savedMessage.timestamp,
  };
}

export async function getChatMessages(
  recordingId: string
): Promise<ChatMessage[]> {
  const messages = await prisma.chat.findMany({
    where: {
      recordingId,
    },
    orderBy: {
      timestamp: "asc",
    },
  });
  return messages.map((message) => ({
    id: message.id,
    recordingId: message.recordingId,
    role: message.role as "user" | "assistant",
    content: message.content,
    timestamp: message.timestamp,
  }));
}

export async function getAudioUrl(audioKey: string) {
  return await getSignedUrl(audioKey);
}
