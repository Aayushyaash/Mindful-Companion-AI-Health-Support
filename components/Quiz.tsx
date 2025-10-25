import React, { useState, useRef, useEffect } from 'react';
import { AppView, ChatMessage } from '../types';
import { createQuizChat } from '../services/geminiService';
import type { Chat } from '@google/genai';
import { ArrowLeft, Send, Loader, Bot, User, Sparkles } from 'lucide-react';

// FIX: Destructure `setView` from props to make it available in the component.
const Quiz: React.FC<{ setView: (view: AppView) => void }> = ({ setView }) => {
  const [step, setStep] = useState<'initial' | 'quiz' | 'analysis'>('initial');
  const [initialProblem, setInitialProblem] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');
  
  const chatRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startQuiz = async () => {
    if (!initialProblem.trim()) return;
    setIsLoading(true);
    setStep('quiz');
    chatRef.current = createQuizChat();
    
    const userMessage: ChatMessage = { role: 'user', content: initialProblem };
    setMessages([userMessage]);
    
    try {
        const result = await chatRef.current.sendMessage({ message: initialProblem });
        const modelResponse = result.text;
        setMessages(prev => [...prev, { role: 'model', content: modelResponse }]);
    } catch(e) {
        console.error(e);
        setMessages(prev => [...prev, { role: 'model', content: "Sorry, I couldn't start the quiz. Please try again." }]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleAnswer = async (answer: string) => {
    if (!answer.trim() || !chatRef.current) return;
    setIsLoading(true);
    const userMessage: ChatMessage = { role: 'user', content: answer };
    setMessages(prev => [...prev, userMessage]);

    try {
        const result = await chatRef.current.sendMessage({ message: answer });
        const modelResponse = result.text;

        if (modelResponse.startsWith("ANALYSIS_COMPLETE:")) {
            const analysis = modelResponse.replace("ANALYSIS_COMPLETE:", "").trim();
            setAnalysisResult(analysis);
            setStep('analysis');
        } else {
            setMessages(prev => [...prev, { role: 'model', content: modelResponse }]);
        }
    } catch(e) {
        console.error(e);
        setMessages(prev => [...prev, { role: 'model', content: "Sorry, an error occurred. Please try again." }]);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
       <button onClick={() => setView(AppView.Home)} className="mb-6 inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Home
      </button>

      <div className="bg-white p-8 rounded-xl shadow-lg">
        <h2 className="text-3xl font-bold text-gray-800 text-center">Guided Self-Assessment</h2>
        
        {step === 'initial' && (
            <div className="mt-6 text-center">
                <p className="text-gray-600 mb-4">Describe what's on your mind or a problem you're facing to begin.</p>
                <textarea 
                    value={initialProblem}
                    onChange={(e) => setInitialProblem(e.target.value)}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white placeholder-gray-400 border-gray-600"
                    rows={4}
                    placeholder="e.g., I've been feeling really anxious lately and have trouble sleeping..."
                />
                <button 
                    onClick={startQuiz} 
                    disabled={isLoading}
                    className="mt-4 bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center mx-auto"
                >
                    {isLoading ? <Loader className="animate-spin h-5 w-5 mr-2" /> : <Sparkles className="h-5 w-5 mr-2" />}
                    Start Assessment
                </button>
            </div>
        )}

        {(step === 'quiz' || step === 'analysis') && (
            <div className="mt-6">
                <div className="h-[50vh] overflow-y-auto p-4 space-y-4 bg-gray-50 rounded-lg">
                    {messages.map((msg, idx) => (
                         <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white flex-shrink-0"><Bot size={20} /></div>}
                            <div className={`p-3 rounded-2xl max-w-lg ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>
                            {msg.role === 'user' && <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white flex-shrink-0"><User size={20} /></div>}
                        </div>
                    ))}
                     {isLoading && step==='quiz' && <div className="flex justify-start"><div className="p-3 rounded-lg bg-gray-200 text-gray-500"><Loader className="animate-spin h-5 w-5" /></div></div>}
                    <div ref={messagesEndRef} />
                </div>
                
                {step === 'quiz' && (
                    // FIX: Pass messages state to QuizInput component.
                    <QuizInput messages={messages} onSubmit={handleAnswer} isLoading={isLoading} />
                )}
                
                {step === 'analysis' && (
                    <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-md">
                        <h3 className="text-xl font-semibold text-blue-800 mb-2">Assessment Summary</h3>
                        <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">{analysisResult}</div>
                    </div>
                )}
            </div>
        )}
        <div className="text-center mt-8 p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 rounded-md text-sm">
            This quiz is a supportive tool, not a diagnostic one. The analysis is generated by an AI and should not replace consultation with a mental health professional.
        </div>
      </div>
    </div>
  );
};


// FIX: Update component props to accept `messages`.
const QuizInput: React.FC<{messages: ChatMessage[], onSubmit: (val: string) => void, isLoading: boolean}> = ({ messages, onSubmit, isLoading }) => {
    const [answer, setAnswer] = useState('');
    const lastQuestion = "What should I do?";

    const handleSubmit = () => {
        onSubmit(answer || lastQuestion);
        setAnswer('');
    };
    
    const quickReplies = (messages[messages.length-1]?.content || "").split('\n').filter(line => /^\s*[A-Da-d]\)/.test(line) || /^\s*(Yes|No)/i.test(line) ).map(line => line.replace(/^\s*[A-Da-d]\)\s*/, ''));

    return (
        <div className="mt-4">
             {quickReplies.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                    {quickReplies.map((reply, i) => (
                        <button key={i} onClick={() => onSubmit(reply)} disabled={isLoading} className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-semibold py-1 px-3 rounded-full disabled:opacity-50">
                            {reply}
                        </button>
                    ))}
                </div>
             )}
            <div className="flex items-center gap-2">
                <input 
                    type="text" 
                    value={answer}
                    onChange={e => setAnswer(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !isLoading && handleSubmit()}
                    placeholder="Type your answer..." 
                    className="flex-1 p-2 border rounded-full px-4 bg-gray-700 text-white placeholder-gray-400 border-gray-600 focus:ring-blue-500" 
                    disabled={isLoading}
                />
                <button onClick={handleSubmit} disabled={isLoading} className="p-3 bg-blue-600 text-white rounded-full disabled:bg-gray-400">
                    <Send size={20}/>
                </button>
            </div>
        </div>
    );
}

export default Quiz;