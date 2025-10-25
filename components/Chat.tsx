import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppView, ChatMessage, Persona } from '../types';
import { createChat, analyzeMood, extractInfoFromDocument } from '../services/geminiService';
import { ArrowLeft, Send, Paperclip, X, Mic, MicOff, Video, VideoOff, Loader, User, Bot, Smile, Meh, Frown } from 'lucide-react';
import type { Chat as GeminiChat } from '@google/genai';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';


// Helper functions for audio encoding/decoding
function encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

const personaInstructions = {
    [Persona.Friend]: "You are role-playing as a warm, empathetic, and supportive friend. Your tone is casual and caring. You listen without judgment and offer encouragement. CRITICAL: Fully commit to this role. Do not break character. Never mention that you are an AI. The user is aware this is a role-play. Avoid all disclaimers about not being a real professional. Format your responses using simple HTML for readability (e.g., `<strong>`, `<ul>`, `<li>`, `<p>`). Do not use `<html>`, `<head>`, `<body>` tags or CSS.",
    [Persona.Therapist]: "You are role-playing as a professional therapist. You maintain a calm, understanding, and clinical tone, guiding the user with thoughtful questions. CRITICAL: You must fully commit to this role-play. Do not break character by stating you are an AI or not a real therapist. The user is aware this is a simulation for support. Avoid all disclaimers. Format your responses using simple HTML for readability (e.g., `<strong>`, `<ul>`, `<li>`, `<p>`). Do not use `<html>`, `<head>`, `<body>` tags or CSS.",
    [Persona.Doctor]: "You are role-playing as a helpful and knowledgeable doctor. You provide clear, concise information based on the user's queries and uploaded documents. CRITICAL: Fully immerse yourself in the role. Do not state that you are an AI or a substitute for a real doctor. The user understands this is a role-play. Provide information and support within this persona without breaking character or giving disclaimers. Format your responses using simple HTML for readability (e.g., `<strong>`, `<ul>`, `<li>`, `<p>`). Do not use `<html>`, `<head>`, `<body>` tags or CSS.",
    [Persona.Counselor]: "You are role-playing as a school or guidance counselor. You are patient and provide practical advice on challenges. Your tone is encouraging and focused on solutions. CRITICAL: Maintain this persona at all times. Do not break character to say you are an AI. The user knows this is a role-play. Avoid giving any disclaimers about not being a substitute for professional advice. Format your responses using simple HTML for readability (e.g., `<strong>`, `<ul>`, `<li>`, `<p>`). Do not use `<html>`, `<head>`, `<body>` tags or CSS."
};

const Chat: React.FC<{ setView: (view: AppView) => void }> = ({ setView }) => {
    const [persona, setPersona] = useState<Persona>(Persona.Friend);
    
    // Function to get chat history from localStorage or initialize it
    const getChatHistory = (p: Persona): ChatMessage[] => {
        try {
            const historyJson = localStorage.getItem(`mindful-companion-chat-${p}`);
            if (historyJson) {
                return JSON.parse(historyJson);
            }
        } catch (e) {
            console.error("Could not parse chat history:", e);
        }
        const instruction = personaInstructions[p];
        return [{ role: 'system', content: instruction }];
    };

    const [messages, setMessages] = useState<ChatMessage[]>(() => getChatHistory(persona));
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [file, setFile] = useState<{ b64: string; type: string; name: string } | null>(null);
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [isLive, setIsLive] = useState(false);
    
    const chatRef = useRef<GeminiChat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);

    const liveSessionPromise = useRef<Promise<any> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const liveStreamRef = useRef<MediaStream | null>(null);

    // Initialize or re-initialize chat when persona changes
    useEffect(() => {
        const history = getChatHistory(persona);
        setMessages(history);
        chatRef.current = createChat(personaInstructions[persona], history);
    }, [persona]);
    
    // Save messages to localStorage whenever they change
    useEffect(() => {
        // We only save if there's more than the initial system message
        if (messages.length > 1) {
            try {
                localStorage.setItem(`mindful-companion-chat-${persona}`, JSON.stringify(messages));
            } catch (e) {
                console.error("Could not save chat history:", e);
            }
        }
    }, [messages, persona]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    
    const captureFrame = useCallback(async (): Promise<string | null> => {
        if (isCameraOn && videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if(ctx) {
                ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                return new Promise(resolve => {
                    canvas.toBlob(blob => {
                        if (!blob) { resolve(null); return; }
                        const reader = new FileReader();
                        reader.onload = () => {
                            const base64 = (reader.result as string).split(',')[1];
                            resolve(base64);
                        };
                        reader.readAsDataURL(blob);
                    }, 'image/jpeg', 0.8);
                });
            }
        }
        return null;
    }, [isCameraOn]);
    
     const saveDocumentAnalysis = (name: string, content: string) => {
        try {
            const documentsJson = localStorage.getItem('mindful-companion-documents');
            const documents = documentsJson ? JSON.parse(documentsJson) : [];
            const newDocument = {
                id: `doc-${Date.now()}`,
                name,
                content,
                timestamp: Date.now()
            };
            documents.push(newDocument);
            localStorage.setItem('mindful-companion-documents', JSON.stringify(documents));
        } catch (e) {
            console.error("Failed to save document analysis:", e);
        }
    };
    
    const handleSend = async () => {
        if (!input.trim() && !file) return;

        setIsLoading(true);
        const userMessageContent = input;
        setInput('');

        const frameB64 = await captureFrame();
        const mood = frameB64 ? await analyzeMood(frameB64) : undefined;
        
        const userMessage: ChatMessage = { role: 'user', content: userMessageContent, mood };
        if (file) {
            userMessage.image = `data:${file.type};base64,${file.b64}`;
        }
        setMessages(prev => [...prev, userMessage]);
        
        const currentFile = file;
        setFile(null); // Clear file from input immediately

        if (currentFile) {
            try {
                const extractedText = await extractInfoFromDocument(currentFile.b64, currentFile.type);
                saveDocumentAnalysis(currentFile.name, extractedText);

                const analysisMessage: ChatMessage = {
                    role: 'model',
                    content: `<div class="p-2 border-l-4 border-blue-300"><strong>Analysis of ${currentFile.name}:</strong><br/>${extractedText}</div>`
                };
                setMessages(prev => [...prev, analysisMessage]);
                
                if (!chatRef.current) throw new Error("Chat not initialized");

                const messageForModel = `A document was just analyzed. Here is the content:\n\n${extractedText}\n\nNow, based on this information, please respond to my original message: "${userMessageContent}"`;
                const result = await chatRef.current.sendMessage({ message: messageForModel });
                setMessages(prev => [...prev, { role: 'model', content: result.text }]);
            } catch (error) {
                console.error(error);
                setMessages(prev => [...prev, { role: 'model', content: "I'm sorry, I encountered an error analyzing the document. Please try again." }]);
            }
        } else {
            try {
                if (!chatRef.current) throw new Error("Chat not initialized");
                const result = await chatRef.current.sendMessage({ message: userMessageContent });
                setMessages(prev => [...prev, { role: 'model', content: result.text }]);
            } catch(error) {
                console.error(error);
                setMessages(prev => [...prev, { role: 'model', content: "I'm sorry, I encountered an error. Please try again." }]);
            }
        }
        
        setIsLoading(false);
    };


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const b64 = (event.target?.result as string).split(',')[1];
                setFile({ b64, type: f.type, name: f.name });
            };
            reader.readAsDataURL(f);
        }
    };
    
    const toggleCamera = async () => {
        if (isCameraOn) {
            mediaStreamRef.current?.getTracks().forEach(track => track.stop());
            setIsCameraOn(false);
            if(videoRef.current) videoRef.current.srcObject = null;
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                mediaStreamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                setIsCameraOn(true);
            } catch (err) {
                console.error("Error accessing camera:", err);
                alert("Could not access camera. Please check permissions.");
            }
        }
    };
    
    const startLiveTalk = async () => {
        setIsLive(true);
        
        if (!process.env.API_KEY) {
            alert("API_KEY not set");
            setIsLive(false);
            return;
        }
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        let nextStartTime = 0;
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            liveStreamRef.current = stream;

            liveSessionPromise.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                        const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob: Blob = {
                                data: encode(new Uint8Array(new Int16Array(inputData.map(x => x * 32768)).buffer)),
                                mimeType: 'audio/pcm;rate=16000',
                            };
                            liveSessionPromise.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContextRef.current!.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
                            const b64Audio = message.serverContent.modelTurn.parts[0].inlineData.data;
                            if (outputAudioContextRef.current) {
                                nextStartTime = Math.max(nextStartTime, outputAudioContextRef.current.currentTime);
                                const audioBuffer = await decodeAudioData(decode(b64Audio), outputAudioContextRef.current, 24000, 1);
                                const source = outputAudioContextRef.current.createBufferSource();
                                source.buffer = audioBuffer;
                                source.connect(outputAudioContextRef.current.destination);
                                source.start(nextStartTime);
                                nextStartTime += audioBuffer.duration;
                            }
                        }
                    },
                    onerror: (e: ErrorEvent) => console.error("Live session error:", e),
                    onclose: () => console.log("Live session closed."),
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    systemInstruction: personaInstructions[persona],
                },
            });
        } catch (err) {
            console.error("Error starting live talk:", err);
            alert("Could not access microphone. Please check permissions.");
            stopLiveTalk();
        }
    };
    
    const stopLiveTalk = () => {
        liveSessionPromise.current?.then(session => session.close());
        liveStreamRef.current?.getTracks().forEach(track => track.stop());
        inputAudioContextRef.current?.close();
        outputAudioContextRef.current?.close();
        liveSessionPromise.current = null;
        setIsLive(false);
    };

    const getMoodIcon = (mood?: string) => {
        if (!mood) return null;
        const lowerMood = mood.toLowerCase();
        if (lowerMood.includes('happy')) return <Smile className="h-4 w-4 text-green-500" />;
        if (lowerMood.includes('sad') || lowerMood.includes('anxious')) return <Frown className="h-4 w-4 text-red-500" />;
        return <Meh className="h-4 w-4 text-yellow-500" />;
    };
    
    return (
        <div className="h-[calc(100vh-120px)] flex flex-col max-w-4xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
                <div className="flex items-center gap-4">
                     <button onClick={() => setView(AppView.Home)} className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold">AI {persona}</h2>
                         <div className="text-xs text-yellow-600">This is an AI, not a real professional.</div>
                    </div>
                </div>
                <select value={persona} onChange={e => setPersona(e.target.value as Persona)} className="p-2 rounded-md border bg-gray-50 focus:ring-2 focus:ring-blue-500">
                    {Object.values(Persona).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.filter(m => m.role !== 'system').map((msg, idx) => (
                    <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white flex-shrink-0"><Bot size={20} /></div>}
                        <div className={`p-3 rounded-2xl max-w-lg ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
                            {msg.image && <img src={msg.image} className="rounded-lg mb-2 max-h-48" alt="user upload"/>}
                            {msg.role === 'model' ? (
                                <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: msg.content }}></div>
                            ) : (
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                            )}
                            {msg.role === 'user' && msg.mood && (
                                <div className="flex items-center gap-1 text-xs mt-2 text-blue-200">
                                    {getMoodIcon(msg.mood)} Mood: {msg.mood}
                                </div>
                            )}
                        </div>
                         {msg.role === 'user' && <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white flex-shrink-0"><User size={20} /></div>}
                    </div>
                ))}
                {isLoading && <div className="flex justify-start"><div className="p-3 rounded-lg bg-gray-200 text-gray-500"><Loader className="animate-spin h-5 w-5" /></div></div>}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t bg-gray-50">
                {isCameraOn && (
                    <div className="relative mb-2">
                        <video ref={videoRef} autoPlay muted className="w-24 h-18 rounded-md bg-black"></video>
                        <button onClick={toggleCamera} className="absolute top-1 right-1 bg-black/50 p-1 rounded-full text-white"><X size={14}/></button>
                    </div>
                )}
                {file && (
                    <div className="mb-2 flex items-center bg-blue-100 text-blue-800 p-2 rounded-md text-sm">
                        <Paperclip className="h-4 w-4 mr-2"/>
                        <span>{file.name}</span>
                        <button onClick={() => setFile(null)} className="ml-auto"><X className="h-4 w-4"/></button>
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <button onClick={toggleCamera} className={`p-2 rounded-full ${isCameraOn ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200'}`}><Video size={20}/></button>
                    <label className="p-2 rounded-full hover:bg-gray-200 cursor-pointer"><Paperclip size={20}/><input type="file" className="hidden" onChange={handleFileChange}/></label>
                    <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !isLoading && handleSend()} placeholder={isLive ? "Live conversation is active..." : "Type a message..."} className="flex-1 p-2 border rounded-full px-4 bg-gray-700 text-white placeholder-gray-400 border-gray-600 focus:ring-2 focus:ring-blue-500" disabled={isLoading || isLive}/>
                    {isLive ? (
                        <button onClick={stopLiveTalk} className="p-3 rounded-full bg-red-500 text-white animate-pulse"><MicOff size={20}/></button>
                    ) : (
                        <button onClick={startLiveTalk} className="p-3 rounded-full bg-green-500 text-white"><Mic size={20}/></button>
                    )}
                    <button onClick={handleSend} disabled={isLoading || isLive} className="p-3 bg-blue-600 text-white rounded-full disabled:bg-gray-400"><Send size={20}/></button>
                </div>
            </div>
        </div>
    );
};

export default Chat;