
export enum AppView {
    Home = 'home',
    Digitizer = 'digitizer',
    Chat = 'chat',
    Quiz = 'quiz',
}

export interface ChatMessage {
    role: 'user' | 'model' | 'system';
    content: string;
    image?: string;
    mood?: string;
}

export enum Persona {
    Friend = 'Friend',
    Therapist = 'Therapist',
    Doctor = 'Doctor',
    Counselor = 'Counselor',
}
