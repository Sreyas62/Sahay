package com.sahay;

import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;

public class AudioRecorderModule extends ReactContextBaseJavaModule {
    private AudioRecord audioRecord;
    private boolean isRecording = false;
    private Thread recordingThread;
    private String currentOutputFile;
    
    private static final int SAMPLE_RATE = 16000;
    private static final int CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO;
    private static final int AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT;

    public AudioRecorderModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "AudioRecorderModule";
    }

    @ReactMethod
    public void startRecording(String fileName, Promise promise) {
        try {
            File cacheDir = getReactApplicationContext().getCacheDir();
            currentOutputFile = new File(cacheDir, fileName.replace(".3gp", ".wav")).getAbsolutePath();

            int bufferSize = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT);
            
            audioRecord = new AudioRecord(
                MediaRecorder.AudioSource.MIC,
                SAMPLE_RATE,
                CHANNEL_CONFIG,
                AUDIO_FORMAT,
                bufferSize
            );

            audioRecord.startRecording();
            isRecording = true;

            recordingThread = new Thread(new Runnable() {
                @Override
                public void run() {
                    writeAudioDataToFile(bufferSize);
                }
            });
            recordingThread.start();

            promise.resolve(currentOutputFile);
        } catch (Exception e) {
            promise.reject("RECORDING_ERROR", "Failed to start recording: " + e.getMessage());
        }
    }

    private void writeAudioDataToFile(int bufferSize) {
        byte[] audioBuffer = new byte[bufferSize];
        FileOutputStream outputStream = null;

        try {
            outputStream = new FileOutputStream(currentOutputFile);
            
            // Write WAV header (placeholder, will be updated when stopping)
            writeWavHeader(outputStream, 0, SAMPLE_RATE, 1);

            while (isRecording) {
                int bytesRead = audioRecord.read(audioBuffer, 0, bufferSize);
                if (bytesRead > 0) {
                    outputStream.write(audioBuffer, 0, bytesRead);
                }
            }
        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            try {
                if (outputStream != null) {
                    outputStream.close();
                }
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
    }

    @ReactMethod
    public void stopRecording(Promise promise) {
        try {
            if (audioRecord != null && isRecording) {
                isRecording = false;
                audioRecord.stop();
                audioRecord.release();
                audioRecord = null;

                if (recordingThread != null) {
                    recordingThread.join();
                }

                // Update WAV header with correct file size
                updateWavHeader(currentOutputFile);

                promise.resolve(currentOutputFile);
            } else {
                promise.reject("NO_RECORDING", "No active recording");
            }
        } catch (Exception e) {
            promise.reject("STOP_ERROR", "Failed to stop recording: " + e.getMessage());
        }
    }

    private void writeWavHeader(FileOutputStream out, long dataSize, int sampleRate, int channels) throws IOException {
        long byteRate = sampleRate * channels * 2; // 16-bit = 2 bytes
        
        out.write(new byte[]{'R', 'I', 'F', 'F'});
        out.write(intToByteArray((int)(dataSize + 36)), 0, 4);
        out.write(new byte[]{'W', 'A', 'V', 'E'});
        out.write(new byte[]{'f', 'm', 't', ' '});
        out.write(intToByteArray(16), 0, 4); // Sub-chunk size
        out.write(shortToByteArray((short)1), 0, 2); // Audio format (1 = PCM)
        out.write(shortToByteArray((short)channels), 0, 2);
        out.write(intToByteArray(sampleRate), 0, 4);
        out.write(intToByteArray((int)byteRate), 0, 4);
        out.write(shortToByteArray((short)(channels * 2)), 0, 2); // Block align
        out.write(shortToByteArray((short)16), 0, 2); // Bits per sample
        out.write(new byte[]{'d', 'a', 't', 'a'});
        out.write(intToByteArray((int)dataSize), 0, 4);
    }

    private void updateWavHeader(String filePath) throws IOException {
        File file = new File(filePath);
        long fileSize = file.length();
        long dataSize = fileSize - 44; // WAV header is 44 bytes

        java.io.RandomAccessFile wavFile = new java.io.RandomAccessFile(file, "rw");
        wavFile.seek(4);
        wavFile.write(intToByteArray((int)(dataSize + 36)), 0, 4);
        wavFile.seek(40);
        wavFile.write(intToByteArray((int)dataSize), 0, 4);
        wavFile.close();
    }

    private byte[] intToByteArray(int value) {
        return ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN).putInt(value).array();
    }

    private byte[] shortToByteArray(short value) {
        return ByteBuffer.allocate(2).order(ByteOrder.LITTLE_ENDIAN).putShort(value).array();
    }
}