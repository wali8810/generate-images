import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import { Generator } from './components/Generator';
import { Library } from './components/Library';
import { Profile } from './components/Profile';
import { CreativeEditor } from './components/CreativeEditor';
import { Onboarding } from './components/Onboarding';
import { AdminPanel } from './components/AdminPanel';
import { StatusBanner } from './components/StatusBanner';
import { View, GeneratedImage } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';

const AppContent: React.FC = () => {
  const { user, loading, dbUser, isAdmin, isUserBlocked } = useAuth();
  const [currentView, setCurrentView] = useState<View>('generator');
  const [apiKeySelected, setApiKeySelected] = useState(false);
  const [checkingKey, setCheckingKey] = useState(true);

  // State for Creative Editor Integration
  const [imageToEdit, setImageToEdit] = useState<GeneratedImage | null>(null);

  // State for Tutorial
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    async function checkApiKey() {
      try {
        if ((window as any).aistudio) {
          const hasKey = await (window as any).aistudio.hasSelectedApiKey();
          setApiKeySelected(hasKey);
        } else {
          setApiKeySelected(true);
        }
      } catch (e) {
        console.error("Error checking API key", e);
        setApiKeySelected(false);
      } finally {
        setCheckingKey(false);
      }
    }
    checkApiKey();
  }, []);

  // Check for first time visitor for tutorial
  useEffect(() => {
    const hasSeen = localStorage.getItem('estampa_magica_tutorial_seen');
    if (!hasSeen) {
      setShowTutorial(true);
    }
  }, []);

  const handleCloseTutorial = () => {
    localStorage.setItem('estampa_magica_tutorial_seen', 'true');
    setShowTutorial(false);
  };

  const handleSelectKey = async () => {
    if ((window as any).aistudio) {
      await (window as any).aistudio.openSelectKey();
      setApiKeySelected(true);
    }
  };

  const handleEditImage = (img: GeneratedImage) => {
    setImageToEdit(img);
    setCurrentView('creative');
  };

  if (loading || checkingKey) {
    return (
      <div className="min-h-screen flex items-center justify-center text-brand-purple bg-gray-50">
        <div className="text-center">
          <i className="fa-solid fa-circle-notch fa-spin text-5xl mb-4"></i>
          <p className="font-bold animate-pulse">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!apiKeySelected && (window as any).aistudio) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
          <i className="fa-solid fa-key text-4xl text-brand-purple mb-4"></i>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Chave de API Necessária</h2>
          <p className="text-gray-600 mb-6">
            Para usar o modelo de alta qualidade, você precisa selecionar uma chave de API válida.
          </p>
          <button
            onClick={handleSelectKey}
            className="w-full bg-brand-purple text-white font-bold py-3 rounded-xl hover:bg-brand-dark transition-all"
          >
            Selecionar Chave de API
          </button>
          <div className="mt-4 text-xs text-gray-400">
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-brand-purple">
              Documentação de Faturamento
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-10">

      {showTutorial && <Onboarding onClose={handleCloseTutorial} />}

      {currentView === 'creative' ? (
        <CreativeEditor initialImage={imageToEdit} onBack={() => setCurrentView('library')} />
      ) : (
        <>
          <Header currentView={currentView} setView={setCurrentView} />

          <main className="max-w-2xl mx-auto px-4">
            <StatusBanner subscriptionStatus={dbUser?.subscription_status} isAdmin={isAdmin} />

            {currentView === 'generator' && (
              <Generator user={user} setView={setCurrentView} isBlocked={isUserBlocked} />
            )}
            {currentView === 'library' && (
              <Library onEdit={handleEditImage} />
            )}
            {currentView === 'profile' && (
              <Profile user={user} onChangeKey={handleSelectKey} />
            )}
          </main>
        </>
      )}
    </div>
  );
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isAdmin) return <Navigate to="/login" />;
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/admin" element={
            <AdminRoute>
              <AdminPanel />
            </AdminRoute>
          } />
          <Route
            path="/"
            element={<AppContent />}
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;
