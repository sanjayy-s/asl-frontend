
import React, { useState } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { FootballIcon } from './common/Icons';

type AuthView = 'login' | 'register';

const Auth: React.FC = () => {
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [name, setName] = useState('');
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, register } = useAppContext();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
        await login(email, dob);
    } catch (err: any) {
        setError(err.message || 'An error occurred.');
    } finally {
        setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name || !email || !dob) {
        setError('All fields are required for registration.');
        return;
    }
    setIsLoading(true);
    try {
        await register(name, email, dob);
    } catch (err: any) {
        setError(err.message || 'An error occurred.');
    } finally {
        setIsLoading(false);
    }
  };
  
  const renderContent = () => {
      switch(view) {
          case 'login':
              return (
                  <>
                    <h2 className="mt-4 text-3xl font-extrabold text-white">Sign in to your account</h2>
                    <form className="space-y-6" onSubmit={handleLoginSubmit}>
                      <div>
                        <label htmlFor="email-address" className="block text-sm font-medium text-gray-300">Email address</label>
                        <input id="email-address" name="email" type="email" autoComplete="email" required className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-600 bg-gray-700 placeholder-gray-400 text-white rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
                      </div>
                      <div>
                        <label htmlFor="dob" className="block text-sm font-medium text-gray-300">Date of Birth</label>
                        <input id="dob" name="dob" type="date" required className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-600 bg-gray-700 placeholder-gray-400 text-white rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm" value={dob} onChange={(e) => setDob(e.target.value)} disabled={isLoading} />
                      </div>
                      <div>
                        <button type="submit" disabled={isLoading} className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-green-500 disabled:bg-gray-500">{isLoading ? 'Signing in...' : 'Sign in'}</button>
                      </div>
                    </form>
                    <div className="text-center">
                      <button onClick={() => setView('register')} className="font-medium text-green-400 hover:text-green-300" disabled={isLoading}>Need an account? Register</button>
                    </div>
                  </>
              );
          case 'register':
              return (
                   <>
                    <h2 className="mt-4 text-3xl font-extrabold text-white">Create a new account</h2>
                    <form className="space-y-6" onSubmit={handleRegisterSubmit}>
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-300">Full Name</label>
                        <input id="name" name="name" type="text" required className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-600 bg-gray-700 placeholder-gray-400 text-white rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm" placeholder="Your Name" value={name} onChange={(e) => setName(e.target.value)} disabled={isLoading} />
                      </div>
                      <div>
                        <label htmlFor="email-address" className="block text-sm font-medium text-gray-300">Email address</label>
                        <input id="email-address" name="email" type="email" autoComplete="email" required className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-600 bg-gray-700 placeholder-gray-400 text-white rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
                      </div>
                      <div>
                        <label htmlFor="dob-register" className="block text-sm font-medium text-gray-300">Date of Birth</label>
                        <input id="dob-register" name="dob" type="date" required className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-600 bg-gray-700 placeholder-gray-400 text-white rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm" value={dob} onChange={(e) => setDob(e.target.value)} disabled={isLoading} />
                      </div>
                      <div>
                        <button type="submit" disabled={isLoading} className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-green-500 disabled:bg-gray-500">{isLoading ? 'Registering...' : 'Register'}</button>
                      </div>
                    </form>
                    <div className="text-center">
                      <button onClick={() => setView('login')} className="font-medium text-green-400 hover:text-green-300" disabled={isLoading}>Already have an account? Sign in</button>
                    </div>
                  </>
              );
      }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="max-w-md w-full bg-gray-800 rounded-xl shadow-lg p-8 space-y-6">
        <div className="text-center">
            <FootballIcon className="mx-auto h-12 w-12 text-green-400" />
        </div>
        
        {error && <p className="text-red-400 text-sm bg-red-500/10 p-3 rounded-md">{error}</p>}
        
        {renderContent()}

      </div>
    </div>
  );
};

export default Auth;