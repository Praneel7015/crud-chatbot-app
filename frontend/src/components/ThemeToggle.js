import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = () => {
    const { isDarkMode, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="theme-toggle"
            title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
        >
            <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
            <span className="theme-toggle-text">
                {isDarkMode ? 'Light' : 'Dark'}
            </span>
        </button>
    );
};

export default ThemeToggle;