import React from 'react';
import { Page } from '../types';
import { HomeIcon, BeakerIcon, ChartBarIcon, DocumentTextIcon, ShieldCheckIcon, SunIcon, MoonIcon } from './icons';

interface HeaderProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentPage, setCurrentPage, theme, toggleTheme }) => {
  const navItems = [
    { id: 'home', label: 'Головна', icon: <HomeIcon /> },
    { id: 'analyzer', label: 'Аналіз Кредиту', icon: <BeakerIcon /> },
    { id: 'dashboard', label: 'Панель Моніторингу', icon: <ChartBarIcon /> },
    { id: 'resources', label: 'Ресурси', icon: <DocumentTextIcon /> },
  ] as const;

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <ShieldCheckIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <span className="ml-3 text-xl font-bold text-gray-800 dark:text-white">MFO Shield Ukraine</span>
          </div>

          <div className="flex items-center">
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  {navItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setCurrentPage(item.id)}
                      className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                        currentPage === item.id
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {React.cloneElement(item.icon, { className: 'h-5 w-5 mr-2' })}
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

               <button
                  onClick={toggleTheme}
                  className="ml-4 p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-blue-500"
                  aria-label="Toggle dark mode"
                >
                  {theme === 'light' ? (
                    <MoonIcon className="h-6 w-6" />
                  ) : (
                    <SunIcon className="h-6 w-6" />
                  )}
                </button>

              <div className="md:hidden flex items-center">
                {/* Mobile menu button can be added here */}
              </div>
          </div>
        </div>
      </nav>
        {/* Mobile Navigation */}
        <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 grid grid-cols-2 gap-2">
                 {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setCurrentPage(item.id)}
                        className={`flex items-center justify-center px-3 py-2 rounded-md text-xs font-medium transition-colors duration-200 ${
                            currentPage === item.id
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                    >
                        {React.cloneElement(item.icon, { className: 'h-4 w-4 mr-1' })}
                        {item.label}
                    </button>
                ))}
            </div>
        </div>
    </header>
  );
};

export default Header;
