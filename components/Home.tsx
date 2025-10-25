
import React from 'react';
import { AppView } from '../types';
import { ScanText, MessageSquare, ListChecks, ArrowRight } from 'lucide-react';

interface HomeProps {
  setView: (view: AppView) => void;
}

const FeatureCard: React.FC<{
  icon: React.ElementType;
  title: string;
  description: string;
  onClick: () => void;
}> = ({ icon: Icon, title, description, onClick }) => (
  <div
    className="bg-white rounded-xl shadow-md p-6 flex flex-col hover:shadow-lg transition-shadow duration-300 cursor-pointer group"
    onClick={onClick}
  >
    <div className="flex items-start justify-between">
        <div className="p-3 bg-blue-100 rounded-full">
            <Icon className="h-8 w-8 text-blue-600" />
        </div>
        <ArrowRight className="h-6 w-6 text-gray-400 group-hover:text-blue-500 transition-colors" />
    </div>
    <div className="mt-4">
      <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
      <p className="text-gray-500 mt-2">{description}</p>
    </div>
  </div>
);

const Home: React.FC<HomeProps> = ({ setView }) => {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold text-gray-800">Your AI-Powered Path to Wellness</h2>
        <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
          Explore tools designed to support your mental health journey. Get insights, find a listening ear, and understand yourself better.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <FeatureCard
          icon={ScanText}
          title="Prescription Digitizer"
          description="Upload an image of your prescription to get a clear, digital version of your medication details."
          onClick={() => setView(AppView.Digitizer)}
        />
        <FeatureCard
          icon={MessageSquare}
          title="AI Companion Chat"
          description="Talk to an AI friend, therapist, or counselor. Supports voice chat and mood analysis for a more empathetic conversation."
          onClick={() => setView(AppView.Chat)}
        />
        <FeatureCard
          icon={ListChecks}
          title="Guided Self-Assessment"
          description="Answer a series of dynamic questions to gain insights into your feelings and receive supportive guidance."
          onClick={() => setView(AppView.Quiz)}
        />
      </div>
       <div className="text-center mt-12 p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 rounded-md">
        <p className="font-semibold">Important Disclaimer</p>
        <p>Mindful Companion is an AI tool for support and is not a substitute for professional medical advice, diagnosis, or treatment. Please consult a qualified healthcare provider for any health concerns.</p>
      </div>
    </div>
  );
};

export default Home;
