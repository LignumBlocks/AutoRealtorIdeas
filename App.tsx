import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ResultsPanel from './components/ResultsPanel';
import ChatPanel from './components/ChatPanel';
import ExperimentPackPanel from './components/ExperimentPackPanel';
import { dbService } from './services/dbService';
import { api, getAccessCode, setAccessCode } from './src/api/client';
import { Topic, Idea, Run, ChatMessage, ExperimentPack } from './types';

const App: React.FC = () => {
  // Data State
  const [topics, setTopics] = useState<Topic[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);

  // Auth State
  const [accessCode, setAccessCodeState] = useState(getAccessCode());
  const [isAuthError, setIsAuthError] = useState(false);

  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('rei_theme') === 'dark';
    }
    return false;
  });

  // Chat State
  const [globalChat, setGlobalChat] = useState<ChatMessage[]>([]);
  const [ideaChats, setIdeaChats] = useState<Record<string, ChatMessage[]>>({});

  // Selection State
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedIdeaIds, setSelectedIdeaIds] = useState<Set<string>>(new Set());
  const [expandedIdea, setExpandedIdea] = useState<Idea | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Experiment Pack State
  const [experimentPack, setExperimentPack] = useState<ExperimentPack | null>(null);
  const [isGeneratingPack, setIsGeneratingPack] = useState(false);
  const [showPackPanel, setShowPackPanel] = useState(false);

  // Layout State
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [chatWidth, setChatWidth] = useState(400);
  const [isResizing, setIsResizing] = useState<'sidebar' | 'chat' | null>(null);

  // --- AUTH & LOAD ---
  const loadData = async () => {
    try {
      setIsAuthError(false);
      const state = await dbService.loadState();
      if (state) {
        setTopics(state.topics || []);
        setIdeas(state.ideas || []);
        setRuns(state.runs || []);
      }
    } catch (e: any) {
      console.error("Failed to load state", e);
      if (e.message.includes('Unauthorized')) {
        setIsAuthError(true);
      }
    }
  };

  useEffect(() => {
    if (accessCode) {
      loadData();
    } else {
      setIsAuthError(true);
    }
  }, [accessCode]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const input = (document.getElementById('accessCodeInput') as HTMLInputElement).value;
    setAccessCode(input);
    setAccessCodeState(input);
  };

  // --- SAVE ---
  const saveAll = async (newTopics: Topic[], newIdeas: Idea[], newRuns: Run[]) => {
    try {
      await dbService.pushState(newTopics, newIdeas, newRuns);
    } catch (e) {
      console.error("Save failed", e);
    }
  };

  // Theme Effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('rei_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('rei_theme', 'light');
    }
  }, [isDarkMode]);

  // Reset context on Topic Change
  useEffect(() => {
    setGlobalChat([]);
    setSelectedIdeaIds(new Set());
    setExpandedIdea(null);
    setShowPackPanel(false);
    setExperimentPack(null);
  }, [selectedTopicId]);

  // --- ACTIONS ---

  const handleRunAnalysis = async (topicId: string) => {
    setIsProcessing(true);
    try {
      // MVP: Always use maxShortlist = 3
      const res = await api.runNow(topicId, 3);
      if (res.success) {
        // Reload state to get new ideas
        await loadData();
      }
    } catch (e) {
      console.error("Run Analysis Failed", e);
      alert("Run failed: " + e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddOrUpdateTopic = async (topic: Topic) => {
    const newTopics = [...topics];
    const index = newTopics.findIndex(t => t.id === topic.id);
    if (index !== -1) {
      newTopics[index] = topic;
    } else {
      newTopics.push(topic);
    }
    setTopics(newTopics);
    await saveAll(newTopics, ideas, runs);
  };

  const handleGeneratePack = async (idea: Idea) => {
    setIsGeneratingPack(true);
    setShowPackPanel(true);
    try {
      const res = await api.generateExperimentPack(idea.id);
      if (res.success) {
        setExperimentPack(res.pack);
      }
    } catch (e) {
      console.error("Generate Pack Failed", e);
      alert("Generation failed: " + e);
      setShowPackPanel(false);
    } finally {
      setIsGeneratingPack(false);
    }
  };

  // Chat Handlers
  const visibleIdeas = selectedTopicId ? ideas.filter(i => i.topicId === selectedTopicId) : [];

  const handleSelectAll = (select: boolean) => {
    if (select) {
      setSelectedIdeaIds(new Set(visibleIdeas.map(i => i.id)));
    } else {
      setSelectedIdeaIds(new Set());
    }
  };

  const activeMessages = expandedIdea
    ? (ideaChats[expandedIdea.id] || [])
    : globalChat;

  let activeContext: Idea[] = [];
  if (expandedIdea) {
    activeContext = [expandedIdea];
  } else if (selectedIdeaIds.size > 0) {
    activeContext = visibleIdeas.filter(i => selectedIdeaIds.has(i.id));
  } else {
    activeContext = visibleIdeas;
  }

  const setActiveMessages = (updater: any) => {
    if (expandedIdea) {
      setIdeaChats(prev => ({
        ...prev,
        [expandedIdea.id]: typeof updater === 'function' ? updater(prev[expandedIdea.id] || []) : updater
      }));
    } else {
      setGlobalChat(updater);
    }
  };

  // Layout Resizing
  const startResizing = useCallback((direction: 'sidebar' | 'chat') => setIsResizing(direction), []);
  const stopResizing = useCallback(() => setIsResizing(null), []);
  const resize = useCallback((e: MouseEvent) => {
    if (isResizing === 'sidebar') setSidebarWidth(Math.max(200, Math.min(400, e.clientX)));
    else if (isResizing === 'chat') setChatWidth(Math.max(300, Math.min(800, window.innerWidth - e.clientX)));
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  // --- RENDER ---

  if (isAuthError) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
        <form onSubmit={handleLogin} className="p-8 bg-white dark:bg-gray-800 rounded shadow-md flex flex-col gap-4">
          <h2 className="text-xl font-bold">REI Access Restricted</h2>
          <p>Please enter the server Access Code to continue.</p>
          <input id="accessCodeInput" type="password" className="border p-2 rounded dark:bg-gray-700" placeholder="Access Code" />
          <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700">Enter</button>
        </form>
      </div>
    );
  }

  return (
    <div className={`h-screen w-screen flex font-sans overflow-hidden transition-colors duration-300 ${isDarkMode ? 'dark bg-dark-950 text-gray-100' : 'bg-white text-gray-900'}`}>

      {/* SIDEBAR */}
      <div style={{ width: sidebarWidth }} className="flex-shrink-0 relative">
        <Sidebar
          topics={topics} runs={runs} selectedTopicId={selectedTopicId}
          onSelectTopic={setSelectedTopicId}
          onAddOrUpdateTopic={handleAddOrUpdateTopic}
          onRunAnalysis={handleRunAnalysis}
          isProcessing={isProcessing}
          isDarkMode={isDarkMode}
          toggleTheme={() => setIsDarkMode(!isDarkMode)}
        />
        <div
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-400 z-50 transition-colors opacity-0 hover:opacity-100"
          onMouseDown={() => startResizing('sidebar')}
        />
      </div>

      {/* CENTER / RESULTS */}
      <div className="flex-1 min-w-[400px] border-r border-gray-100 dark:border-dark-800 relative overflow-hidden bg-white dark:bg-dark-950">
        <ResultsPanel
          ideas={visibleIdeas} selectedIdeaIds={selectedIdeaIds}
          onToggleSelection={(id) => {
            const next = new Set(selectedIdeaIds);
            if (next.has(id)) next.delete(id); else next.add(id);
            setSelectedIdeaIds(next);
          }}
          onSelectAll={handleSelectAll}
          onExpandIdea={setExpandedIdea}
          onGeneratePack={handleGeneratePack}
          selectedTopicName={topics.find(t => t.id === selectedTopicId)?.name}
          isProcessing={isProcessing}
        />
      </div>

      {/* CHAT / RIGHT PANEL */}
      <div style={{ width: chatWidth }} className="flex-shrink-0 relative bg-white dark:bg-dark-950">
        <div
          className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-blue-400 z-50 transition-colors opacity-0 hover:opacity-100"
          onMouseDown={() => startResizing('chat')}
        />
        <ChatPanel
          messages={activeMessages}
          setMessages={setActiveMessages}
          contextIdeas={activeContext}
          mode={expandedIdea ? 'local' : 'global'}
        />
      </div>

      {/* EXPERIMENT PACK PANEL (Drawer) */}
      {showPackPanel && (
        <ExperimentPackPanel
          pack={experimentPack}
          ideaTitle={expandedIdea?.title || ''}
          onClose={() => setShowPackPanel(false)}
          isLoading={isGeneratingPack}
        />
      )}
    </div>
  );
};

export default App;
