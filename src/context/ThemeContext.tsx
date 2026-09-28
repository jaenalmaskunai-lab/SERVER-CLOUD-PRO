import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeType = 'enterprise-light' | 'cpanel-classic' | 'cyber-dark' | 'nordic-ocean';

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  isLight: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default to enterprise-light as requested ("ubah tampilan menjadi terang")
  const [theme, setThemeState] = useState<ThemeType>(() => {
    const saved = localStorage.getItem('cloudpro_theme') as ThemeType;
    if (saved && ['enterprise-light', 'cpanel-classic', 'cyber-dark', 'nordic-ocean'].includes(saved)) {
      return saved;
    }
    return 'enterprise-light';
  });

  const isLight = theme === 'enterprise-light' || theme === 'cpanel-classic' || theme === 'nordic-ocean';

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    localStorage.setItem('cloudpro_theme', newTheme);
  };

  const toggleTheme = () => {
    if (isLight) {
      setTheme('cyber-dark');
    } else {
      setTheme('enterprise-light');
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    // Remove previous theme classes
    root.classList.remove('theme-enterprise-light', 'theme-cpanel-classic', 'theme-cyber-dark', 'theme-nordic-ocean', 'dark', 'light');
    
    // Add current theme class
    root.classList.add(`theme-${theme}`);
    if (isLight) {
      root.classList.add('light');
    } else {
      root.classList.add('dark');
    }

    // Set background color of body directly to prevent flash
    if (theme === 'enterprise-light') {
      document.body.style.backgroundColor = '#f8fafc'; // slate-50
      document.body.style.color = '#0f172a'; // slate-900
    } else if (theme === 'cpanel-classic') {
      document.body.style.backgroundColor = '#f1f5f9'; // slate-100
      document.body.style.color = '#1e293b'; // slate-800
    } else if (theme === 'nordic-ocean') {
      document.body.style.backgroundColor = '#f0fdfa'; // teal-50
      document.body.style.color = '#0f172a';
    } else {
      document.body.style.backgroundColor = '#090d16';
      document.body.style.color = '#f8fafc';
    }
  }, [theme, isLight]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isLight, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
