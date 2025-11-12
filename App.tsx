
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import { Page, LoanDetails, AnalysisResult } from './types';
import { generateComplaintDraft } from './services/geminiService';
import { getMfoViolationData, getRegionalData, getViolationTypeData } from './services/analyticsService';
import { SparklesIcon, ClipboardCopyIcon } from './components/icons';

// In a larger application, each page component would be in its own file.
// They are included here because new files cannot be added.

const HomePage: React.FC = () => (
    <div className="container mx-auto px-4 py-8">
        <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">Ласкаво просимо до MFO Shield Ukraine</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
                Ваш надійний помічник у перевірці законності умов мікрокредитів в Україні. Проаналізуйте свій кредит, перегляньте статистику та отримайте допомогу у захисті своїх прав.
            </p>
        </div>
    </div>
);

const AnalyzerPage: React.FC = () => {
    const [loanDetails, setLoanDetails] = useState<LoanDetails>({
        principal: '5000',
        dailyRate: '0.019',
        termDays: '30',
        totalPayment: '7850',
    });
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [complaint, setComplaint] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLoanDetails(prev => ({ ...prev, [name]: value }));
    };

    const handleAnalyze = (e: React.FormEvent) => {
        e.preventDefault();
        // This is mock analysis logic. A real application would have more complex, legally-accurate calculations.
        const dailyRateNum = parseFloat(loanDetails.dailyRate);
        const principalNum = parseFloat(loanDetails.principal);
        const totalPaymentNum = parseFloat(loanDetails.totalPayment);
        const violations = [];

        // Ukrainian law limits daily rate to around 1% (this is a simplification for demo)
        if (dailyRateNum > 0.01) {
            violations.push({
                type: "Перевищення максимальної денної ставки",
                legal_limit: "1%",
                actual_rate: `${(dailyRateNum * 100).toFixed(2)}%`,
                excess: `${((dailyRateNum - 0.01) * 100).toFixed(2)}%`,
            });
        }
        
        // Total payment cannot be more than double the principal (simplified rule)
        if (totalPaymentNum > principalNum * 2) {
             violations.push({
                type: "Перевищення максимальної суми до повернення",
                legal_limit: `${principalNum * 2} UAH`,
                actual_rate: `${totalPaymentNum} UAH`,
                excess: `${(totalPaymentNum - principalNum * 2).toFixed(2)} UAH`,
            });
        }

        const result: AnalysisResult = {
            is_lawful: violations.length === 0,
            violations: violations,
            recommended_action: violations.length > 0 ? "Рекомендовано подати скаргу до НБУ для перевірки законності умов." : "На основі введених даних, умови кредиту виглядають законними.",
        };
        setAnalysisResult(result);
        setComplaint('');
    };
    
    const handleGenerateComplaint = async () => {
        if (!analysisResult || analysisResult.is_lawful) return;
        setIsLoading(true);
        setError('');
        setComplaint('');
        try {
            const draft = await generateComplaintDraft(loanDetails, analysisResult);
            setComplaint(draft);
        } catch (e) {
            setError('Не вдалося згенерувати скаргу. Спробуйте пізніше.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="container mx-auto px-4 py-8">
            <h2 className="text-3xl font-bold text-center mb-6 text-gray-800 dark:text-white">Аналізатор Кредитного Договору</h2>
            
            <div className="max-w-lg mx-auto bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <form onSubmit={handleAnalyze}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1" htmlFor="principal">Сума кредиту (грн)</label>
                        <input type="number" name="principal" id="principal" value={loanDetails.principal} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" required />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1" htmlFor="dailyRate">Денна ставка (у форматі 0.01 для 1%)</label>
                        <input type="number" step="0.001" name="dailyRate" id="dailyRate" value={loanDetails.dailyRate} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" required />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1" htmlFor="termDays">Термін (днів)</label>
                        <input type="number" name="termDays" id="termDays" value={loanDetails.termDays} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" required />
                    </div>
                     <div className="mb-6">
                        <label className="block text-sm font-medium mb-1" htmlFor="totalPayment">Загальна сума до сплати (грн)</label>
                        <input type="number" name="totalPayment" id="totalPayment" value={loanDetails.totalPayment} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" required />
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 transition duration-300">
                        Проаналізувати
                    </button>
                </form>
             </div>

            {analysisResult && (
                <div className="mt-8 max-w-2xl mx-auto bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <h3 className="text-2xl font-bold mb-4">Результати Аналізу</h3>
                    {analysisResult.is_lawful ? (
                        <p className="text-green-600 dark:text-green-400 font-semibold">✅ Порушень не виявлено.</p>
                    ) : (
                         <div>
                            <p className="text-red-600 dark:text-red-400 font-semibold">❗️ Виявлено можливі порушення:</p>
                            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                                {analysisResult.violations.map((v, i) => (
                                    <li key={i}><b>{v.type}:</b> фактичне значення ({v.actual_rate}) перевищує ліміт ({v.legal_limit}).</li>
                                ))}
                            </ul>
                         </div>
                    )}
                    <p className="mt-4 text-gray-600 dark:text-gray-300"><em>{analysisResult.recommended_action}</em></p>
                    {!analysisResult.is_lawful && (
                        <button 
                            onClick={handleGenerateComplaint} 
                            disabled={isLoading}
                            className="mt-6 w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded hover:bg-indigo-700 transition duration-300 flex items-center justify-center disabled:bg-indigo-400 disabled:cursor-not-allowed"
                        >
                            <SparklesIcon className="w-5 h-5 mr-2" />
                            {isLoading ? 'Генерація...' : 'Згенерувати проект скарги за допомогою AI'}
                        </button>
                    )}
                </div>
            )}
             {complaint && (
                <div className="mt-8 max-w-2xl mx-auto bg-gray-50 dark:bg-gray-900 p-6 rounded-lg shadow-md relative">
                    <h3 className="text-2xl font-bold mb-4">Проект Скарги</h3>
                    <button 
                        onClick={() => navigator.clipboard.writeText(complaint)}
                        className="absolute top-4 right-4 bg-gray-200 dark:bg-gray-700 p-2 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        title="Скопіювати в буфер обміну"
                    >
                        <ClipboardCopyIcon className="w-5 h-5" />
                    </button>
                    <pre className="whitespace-pre-wrap font-sans text-sm bg-gray-100 dark:bg-gray-800 p-4 rounded-md mt-2">{complaint}</pre>
                </div>
             )}
             {error && <p className="text-red-500 text-center mt-4">{error}</p>}
        </div>
    );
};

const DashboardPage: React.FC = () => {
    const mfoData = getMfoViolationData();
    const typeData = getViolationTypeData();
    const regionData = getRegionalData();
    
    return (
        <div className="container mx-auto px-4 py-8">
            <h2 className="text-3xl font-bold text-center mb-6 text-gray-800 dark:text-white">Панель Моніторингу</h2>
            <p className="text-center text-gray-600 dark:text-gray-300 mb-8">
                Статистика порушень на ринку мікрокредитування (демонстраційні дані).
            </p>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <h3 className="font-bold text-lg mb-4 text-gray-800 dark:text-white">Порушення по МФО</h3>
                    <ul>{mfoData.map(d => <li key={d.name} className="flex justify-between py-1 border-b dark:border-gray-700"><span>{d.name}</span><span className="font-semibold">{d.violations}</span></li>)}</ul>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                     <h3 className="font-bold text-lg mb-4 text-gray-800 dark:text-white">Типи Порушень</h3>
                     <ul>{typeData.map(d => <li key={d.name} className="flex justify-between py-1 border-b dark:border-gray-700"><span>{d.name}</span><span className="font-semibold">{d.value}</span></li>)}</ul>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                     <h3 className="font-bold text-lg mb-4 text-gray-800 dark:text-white">Статистика по Регіонах</h3>
                     <ul>{regionData.map(d => <li key={d.region} className="flex justify-between py-1 border-b dark:border-gray-700"><span>{d.region}</span><span className="font-semibold">{d.cases}</span></li>)}</ul>
                </div>
            </div>
        </div>
    );
};

const ResourcesPage: React.FC = () => (
    <div className="container mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold text-center mb-6 text-gray-800 dark:text-white">Корисні Ресурси</h2>
        <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h3 className="font-bold text-xl mb-3 text-gray-800 dark:text-white">Законодавство</h3>
            <ul className="list-disc list-inside space-y-2">
                <li><a href="https://zakon.rada.gov.ua/laws/show/1734-19#Text" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Закон України "Про споживче кредитування"</a></li>
            </ul>
             <h3 className="font-bold text-xl mb-3 mt-6 text-gray-800 dark:text-white">Контролюючі органи</h3>
            <ul className="list-disc list-inside space-y-2">
                 <li><a href="https://bank.gov.ua/ua/consumer-protection" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Національний Банк України (Захист прав споживачів)</a></li>
            </ul>
        </div>
    </div>
);


const App: React.FC = () => {
    const [currentPage, setCurrentPage] = useState<Page>('home');
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        if (typeof window !== 'undefined') {
            if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                return 'dark';
            }
        }
        return 'light';
    });

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [theme]);
    
    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    const renderPage = () => {
        switch (currentPage) {
            case 'home':
                return <HomePage />;
            case 'analyzer':
                return <AnalyzerPage />;
            case 'dashboard':
                return <DashboardPage />;
            case 'resources':
                return <ResourcesPage />;
            default:
                return <HomePage />;
        }
    };
    
    return (
        <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 transition-colors duration-300">
            <Header currentPage={currentPage} setCurrentPage={setCurrentPage} theme={theme} toggleTheme={toggleTheme} />
            <main className="flex-grow">
                {renderPage()}
            </main>
            <Footer />
        </div>
    );
};

export default App;
