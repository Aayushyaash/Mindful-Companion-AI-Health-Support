import React, { useState, useEffect } from 'react';
import { ChatMessage } from '../types';
import { Trash2, X, Bot, User, ChevronDown } from 'lucide-react';

interface ChatHistoryModalProps {
    onClose: () => void;
    onHistoryCleared: (persona: string) => void;
}

const ChatHistoryModal: React.FC<ChatHistoryModalProps> = ({ onClose, onHistoryCleared }) => {
    const [allHistories, setAllHistories] = useState<Record<string, ChatMessage[]>>({});
    const [expandedPersona, setExpandedPersona] = useState<string | null>(null);

    useEffect(() => {
        const histories: Record<string, ChatMessage[]> = {};
        const keys = Object.keys(localStorage);
        for (const key of keys) {
            if (key && key.startsWith('mindful-companion-chat-')) {
                const personaName = key.replace('mindful-companion-chat-', '');
                try {
                    const historyJson = localStorage.getItem(key);
                    if (historyJson) {
                        const parsedHistory = JSON.parse(historyJson);
                        if (Array.isArray(parsedHistory) && parsedHistory.length > 1) {
                            histories[personaName] = parsedHistory;
                        }
                    }
                } catch (e) {
                    console.error(`Failed to parse history for ${personaName}`, e);
                }
            }
        }
        setAllHistories(histories);
    }, []);

    const handleClearHistory = (personaName: string) => {
        if (window.confirm(`Are you sure you want to delete all chat history for ${personaName}? This action cannot be undone.`)) {
            localStorage.removeItem(`mindful-companion-chat-${personaName}`);
            setAllHistories(prev => {
                const newHistories = { ...prev };
                delete newHistories[personaName];
                return newHistories;
            });
            onHistoryCleared(personaName);
        }
    };
    
    const togglePersona = (personaName: string) => {
        setExpandedPersona(prev => prev === personaName ? null : personaName);
    };

    const personas = Object.keys(allHistories).sort();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-bold text-gray-800">Chat History</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200">
                        <X className="h-6 w-6 text-gray-600" />
                    </button>
                </header>
                <main className="p-4 overflow-y-auto">
                    {personas.length > 0 ? (
                        <div className="space-y-2">
                            {personas.map(personaName => (
                                <div key={personaName} className="border rounded-lg">
                                    <div className="p-3 flex justify-between items-center cursor-pointer hover:bg-gray-50" onClick={() => togglePersona(personaName)}>
                                        <h3 className="font-semibold text-lg text-gray-700">{personaName}</h3>
                                        <div className="flex items-center gap-2">
                                            <button onClick={(e) => { e.stopPropagation(); handleClearHistory(personaName); }} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100" title={`Clear ${personaName} history`}>
                                                <Trash2 size={18} />
                                            </button>
                                            <ChevronDown className={`text-gray-500 transform transition-transform duration-200 ${expandedPersona === personaName ? 'rotate-180' : ''}`} />
                                        </div>
                                    </div>
                                    {expandedPersona === personaName && (
                                        <div className="border-t p-4 max-h-64 overflow-y-auto bg-gray-50/50 space-y-3">
                                            {allHistories[personaName].filter(m => m.role !== 'system').map((msg, idx) => (
                                                <div key={idx} className={`flex gap-2 text-sm ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                    {msg.role === 'model' && <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white flex-shrink-0"><Bot size={16} /></div>}
                                                    <div className={`p-2 rounded-lg max-w-[80%] ${msg.role === 'user' ? 'bg-blue-100' : 'bg-gray-200'}`}>
                                                        <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: msg.content }}></div>
                                                    </div>
                                                    {msg.role === 'user' && <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-white flex-shrink-0"><User size={16} /></div>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 py-8">No chat history found.</p>
                    )}
                </main>
            </div>
        </div>
    );
};

export default ChatHistoryModal;
