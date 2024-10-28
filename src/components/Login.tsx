import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import useAlert from '../hooks/useAlert';
import Alert from './Alert';

const Login: React.FC = () => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { alert, showAlert, hideAlert } = useAlert();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(emailOrUsername, password);
      navigate('/');
    } catch (error) {
      showAlert({
        type: 'error',
        message: error instanceof Error ? error.message : 'Email/Username atau password salah'
      });
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 fixed inset-0 overflow-hidden">
      <div className="w-full max-w-sm sm:max-w-md space-y-6 bg-white/95 backdrop-blur-sm p-6 sm:p-8 rounded-xl shadow-2xl mx-4">
        <div className="text-center">
          <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-4" />
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Welcome Back
          </h2>
          <p className="mt-2 text-sm sm:text-base text-gray-600">
            Please sign in to your account
          </p>
        </div>
        
        <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-3 sm:space-y-4">
            <div>
              <label htmlFor="emailOrUsername" className="block text-sm font-medium text-gray-700 mb-1">
                Email atau Username
              </label>
              <input
                id="emailOrUsername"
                name="emailOrUsername"
                type="text"
                required
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                className="block w-full px-3 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 transition-all duration-300 text-sm sm:text-base"
                placeholder="Masukkan email atau username"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-3 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 transition-all duration-300 text-sm sm:text-base"
                placeholder="Masukkan password"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2 sm:py-3 px-4 border border-transparent rounded-lg text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 font-medium text-sm sm:text-base"
          >
            Sign in
          </button>
        </form>
      </div>

      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={hideAlert}
        />
      )}
    </div>
  );
};

export default Login;
