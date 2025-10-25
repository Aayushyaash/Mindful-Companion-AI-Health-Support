
import React, { useState } from 'react';
import Home from './components/Home';
import PrescriptionDigitizer from './components/PrescriptionDigitizer';
import Chat from './components/Chat';
import Quiz from './components/Quiz';
import { AppView } from './types';
import { BrainCircuit } from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.Home);

  const renderView = () => {
    switch (currentView) {
      case AppView.Digitizer:
        return <PrescriptionDigitizer setView={setCurrentView} />;
      case AppView.Chat:
        return <Chat setView={setCurrentView} />;
      case AppView.Quiz:
        return <Quiz setView={setCurrentView} />;
      case AppView.Home:
      default:
        return <Home setView={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
           <div 
             className="flex items-center gap-2 cursor-pointer"
             onClick={() => setCurrentView(AppView.Home)}
            >
            <BrainCircuit className="h-8 w-8 text-blue-500" />
            <h1 className="text-2xl font-bold text-gray-700 tracking-tight">
              Mindful Companion
            </h1>
          </div>
        </div>
      </header>
      <main className="container mx-auto p-4 md:p-6">
        {renderView()}
      </main>
    </div>
  );
};

export default App;
