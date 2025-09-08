
import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import Logo from "./logo.svg";
import { useAppContext } from './hooks/useAppContext';
import Auth from './components/Auth';
import HomePage from './components/HomePage';
import ProfileModal from './components/ProfileModal';
import TeamPage from './components/TeamPage';
import TournamentPage from './components/TournamentPage';
import LiveScoringPage from './components/LiveScoringPage';
import Sidebar from './components/Sidebar';
import { FootballIcon, BellIcon, MenuIcon } from './components/common/Icons';
import ProfilePage from './components/ProfilePage';
import PlayerProfilePage from './components/PlayerProfilePage';
import MyMatchesPage from './components/MyMatchesPage';
import { Notification } from './types';

const NotificationsDropdown: React.FC<{
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClose: () => void;
}> = ({ notifications, onMarkAsRead, onMarkAllAsRead, onClose }) => {
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      onMarkAsRead(notification._id);
    }
    navigate(notification.link);
    onClose();
  };

  return (
    <div ref={dropdownRef} className="absolute top-full left-4 right-4 mt-2 w-auto rounded-lg shadow-lg z-50 bg-gray-800 border border-gray-700 md:w-80 md:left-auto md:right-0">
      <div className="p-3 flex justify-between items-center border-b border-gray-700">
        <h3 className="font-semibold">Notifications</h3>
        <button onClick={onMarkAllAsRead} className="text-sm text-green-400 hover:underline">Mark all as read</button>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {notifications.length > 0 ? (
          notifications.map(n => (
            <div
              key={n._id}
              onClick={() => handleNotificationClick(n)}
              className={`p-3 border-b border-gray-700/50 hover:bg-gray-700 cursor-pointer ${!n.isRead ? 'bg-green-600/10' : ''}`}
            >
              <p className="text-sm">{n.message}</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
            </div>
          ))
        ) : (
          <p className="p-4 text-center text-sm text-gray-400">No new notifications.</p>
        )}
      </div>
    </div>
  );
};


const Header: React.FC<{ onToggleSidebar: () => void }> = ({ onToggleSidebar }) => {
  const { currentUser, logout, notifications, markNotificationAsRead, markAllNotificationsAsRead } = useAppContext();
  const navigate = useNavigate();
  const [isNotificationsOpen, setNotificationsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };
  
  const userNotifications = currentUser ? notifications.filter(n => n.userId === currentUser._id) : [];
  const unreadCount = userNotifications.filter(n => !n.isRead).length;

  return (
    <header className="bg-gray-800 p-4 shadow-md flex-shrink-0 z-20 relative">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-4">
          {currentUser && (
            <button
              onClick={onToggleSidebar}
              className="md:hidden text-gray-300 hover:text-white"
              aria-label="Open navigation menu"
            >
              <MenuIcon />
            </button>
          )}
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-green-400 hover:text-green-300">
            <img src={Logo} alt="ASL logo" className="h-8 w-8" />
            <span>ASL</span>
          </Link>
        </div>
        <nav>
          {currentUser ? (
            <div className="flex items-center gap-4">
              <div className="static md:relative">
                <button onClick={() => setNotificationsOpen(prev => !prev)} className="relative text-gray-300 hover:text-white">
                  <BellIcon />
                  {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold">{unreadCount}</span>
                  )}
                </button>
                {isNotificationsOpen && (
                  <NotificationsDropdown
                    notifications={userNotifications}
                    onMarkAsRead={markNotificationAsRead}
                    onMarkAllAsRead={markAllNotificationsAsRead}
                    onClose={() => setNotificationsOpen(false)}
                  />
                )}
              </div>
              <Link to="/profile" className="font-semibold hover:text-green-400 transition-colors">
                {currentUser.profile.name}
              </Link>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition duration-300"
              >
                Logout
              </button>
            </div>
          ) : (
             <span className="text-gray-400">Welcome, Guest</span>
          )}
        </nav>
      </div>
    </header>
  );
};


const App: React.FC = () => {
  const { currentUser, isProfileComplete, isLoading } = useAppContext();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  
if (isLoading) {
  return (
    <div className="h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
      <img
        src={Logo}
        alt="Loading..."
        className="h-16 w-16 animate-spin"
      />
    </div>
  );
}

  const showAppLayout = currentUser && isProfileComplete();

  return (
    <div className="h-screen bg-gray-900 text-gray-100 flex flex-col">
      <Header onToggleSidebar={() => setSidebarOpen(prev => !prev)} />
       <div className="flex flex-grow overflow-hidden relative">
        {showAppLayout && (
          <>
            <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
            {isSidebarOpen && (
                <div 
                    onClick={() => setSidebarOpen(false)} 
                    className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
                    aria-hidden="true"
                ></div>
            )}
          </>
        )}
        <main className="flex-grow p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {!currentUser ? (
            <Auth />
          ) : !isProfileComplete() ? (
            <div className="container mx-auto">
              <HomePage />
              <ProfileModal isOpen={true} onClose={() => {}} />
            </div>
          ) : (
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/player/:playerId" element={<PlayerProfilePage />} />
              <Route path="/matches" element={<MyMatchesPage />} />
              <Route path="/team/:teamId" element={<TeamPage />} />
              <Route path="/tournament/:tournamentId" element={<TournamentPage />} />
              <Route path="/match/:matchId/score" element={<LiveScoringPage />} />
            </Routes>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
