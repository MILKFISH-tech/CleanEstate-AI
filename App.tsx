// ============================================================
// App - 應用程式根元件
// 負責路由、全域錯誤捕捉、使用者會話管理
// ============================================================

import React, { useState, useCallback } from 'react';
import LoginView from './components/LoginView';
import AdminDashboard from './components/AdminDashboard';
import EditorView from './components/EditorView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SessionUser } from './types';
import { Logger } from './services/logger';

const log = Logger.create('App');

type ViewState = 'login' | 'admin' | 'editor';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('login');
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);

  const handleLoginSuccess = useCallback((user: SessionUser) => {
    setCurrentUser(user);
    log.info('登入成功', { userId: user.id, role: user.role });
    setCurrentView(user.role === 'admin' ? 'admin' : 'editor');
  }, []);

  const handleLogout = useCallback(() => {
    log.info('登出', { userId: currentUser?.id });
    setCurrentUser(null);
    setCurrentView('login');
  }, [currentUser]);

  // 路由渲染
  const renderView = () => {
    switch (currentView) {
      case 'login':
        return (
          <ErrorBoundary label="LoginView">
            <LoginView onLoginSuccess={handleLoginSuccess} />
          </ErrorBoundary>
        );
      case 'admin':
        return (
          <ErrorBoundary label="AdminDashboard">
            <AdminDashboard 
              onLogout={handleLogout} 
              onNavigateToEditor={() => setCurrentView('editor')} 
              currentUser={currentUser}
            />
          </ErrorBoundary>
        );
      case 'editor':
      default:
        return (
          <ErrorBoundary label="EditorView">
            <EditorView 
              onLogout={handleLogout} 
              isAdmin={currentUser?.role === 'admin'}
              onNavigateToAdmin={() => setCurrentView('admin')}
              currentUser={currentUser}
            />
          </ErrorBoundary>
        );
    }
  };

  return (
    <ErrorBoundary label="App Root">
      {renderView()}
    </ErrorBoundary>
  );
}
