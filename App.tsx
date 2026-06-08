
import React, { useState, useEffect, useCallback } from 'react';
import { Theme } from './types';
import ThemeToggle from './components/ThemeToggle';
import ImageEditor from './components/ImageEditor';

function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    // Initialize theme from localStorage or system preference
    if (typeof window !== 'undefined' && localStorage.getItem('theme')) {
      return localStorage.getItem('theme') as Theme;
    }
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      return newTheme;
    });
  }, []);

  useEffect(() => {
    // Apply theme class to the document root element
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    // Set body background and text color based on theme
    const body = document.body;
    if (theme === 'dark') {
      body.classList.add('bg-black', 'text-gray-100');
      body.classList.remove('bg-white', 'text-gray-900');
    } else {
      body.classList.add('bg-white', 'text-gray-900');
      body.classList.remove('bg-black', 'text-gray-100');
    }
  }, [theme]);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-black text-gray-900 dark:text-gray-100 transition-colors duration-300 ease-in-out">
      {/* Header */}
      <header className="w-full flex justify-between items-center p-4 sm:p-6 bg-emerald-600 dark:bg-emerald-800 shadow-md transition-colors duration-300 ease-in-out">
        <h1 className="text-2xl sm:text-3xl font-bold text-white dark:text-emerald-200 transition-colors duration-300 ease-in-out">
          Gemini Image Magic
        </h1>
        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center p-4 sm:p-6 md:p-8">
        <ImageEditor />
      </main>

      {/* Footer */}
      <footer className="w-full py-4 bg-emerald-600 dark:bg-emerald-800 text-white dark:text-emerald-200 text-center text-sm shadow-inner transition-colors duration-300 ease-in-out">
        <p>&copy; {new Date().getFullYear()} Gemini Image Editor. Powered by Google AI.</p>
      </footer>
    </div>
  );
}

export default App;
