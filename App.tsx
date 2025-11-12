import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Header from './components/Header';
import Footer from './components/Footer';
import { Page, AnalysisResult, Violation, LoanDetails, MfoViolationData, RegionalData, ViolationTypeData } from './types';
import { generateComplaintDraft } from './services/geminiService';
import { getMfoViolationData, getRegionalData, getViolationTypeData } from './services/analyticsService';
import { ClipboardCopyIcon } from './components/icons';

// As page components are not provided, creating simple placeholders here.
const HomePage: React.FC = () => (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 text-center">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-800 dark:text-white leading-tight">
            Ласкаво просимо до MFO Shield Ukraine
        </h1>
        <p className="mt-4 text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Ваш надійний помічник у захисті прав споживачів фінансових послуг. Проаналізуйте свій кредитний договір та отримайте допомогу.
        </p>
    </div>
);

const AnalyzerPage: React.FC = () => {
    // State for calculator inputs
    const [calcPrincipal, setCalcPrincipal] = useState('');
    const [calcDailyRate, setCalcDailyRate] = useState('');
    const [calcTermDays, setCalcTermDays] = useState('');
    const [calcResult, setCalcResult] = useState<{ totalPayment: number; dailyRatePercent: number } | null>(null);
    const [calcError, setCalcError] = useState('');

    // State for AI Analyzer inputs
    const [analysisPrincipal, setAnalysisPrincipal] = useState('');
    const [analysisDailyRate, setAnalysisDailyRate] = useState('');
    const [analysisTerm, setAnalysisTerm] = useState('');
    
    // State for AI analysis results
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState('');

    // State for Complaint Generation
    const [complaintDraft, setComplaintDraft] = useState('');
    const [isGeneratingComplaint, setIsGeneratingComplaint] = useState(false);
    const [complaintError, setComplaintError] = useState('');
    const [copied, setCopied] = useState(false);


    const handleCalculate = (e: React.FormEvent) => {
        e.preventDefault();
        setCalcError('');
        setCalcResult(null);

        const numPrincipal = parseFloat(calcPrincipal);
        const numDailyRate = parseFloat(calcDailyRate);
        const numTermDays = parseInt(calcTermDays, 10);

        if (isNaN(numPrincipal) || isNaN(numDailyRate) || isNaN(numTermDays) || numPrincipal <= 0 || numDailyRate < 0 || numTermDays <= 0) {
            setCalcError('Будь ласка, введіть дійсні додатні числа в усі поля.');
            return;
        }

        const rateAsDecimal = numDailyRate / 100;
        const totalInterest = numPrincipal * rateAsDecimal * numTermDays;
        const totalPayment = numPrincipal + totalInterest;

        setCalcResult({
            totalPayment: totalPayment,
            dailyRatePercent: numDailyRate
        });
    };

    const handleAnalyze = (e: React.FormEvent) => {
        e.preventDefault();
        setIsAnalyzing(true);
        setAnalysisError('');
        setAnalysisResult(null);
        setComplaintDraft('');
        setComplaintError('');

        const principal = parseFloat(analysisPrincipal);
        const dailyRatePercent = parseFloat(analysisDailyRate);
        const term = parseInt(analysisTerm, 10);

        if (isNaN(principal) || isNaN(dailyRatePercent) || isNaN(term) || principal <= 0 || dailyRatePercent < 0 || term <= 0) {
            setAnalysisError('Будь ласка, введіть дійсні додатні числа для аналізу.');
            setIsAnalyzing(false);
            return;
        }

        const dailyRateDecimal = dailyRatePercent / 100;
        const totalPayment = principal * (1 + dailyRateDecimal * term);

        // --- Core Analysis Logic based on Ukrainian Law ---
        const MAX_DAILY_RATE = 1.0; // 1%
        const MAX_TOTAL_MULTIPLIER = 2.0; // 2x principal

        const violations: Violation[] = [];

        // Check 1: Daily rate
        if (dailyRatePercent > MAX_DAILY_RATE) {
            violations.push({
                type: 'Перевищення денної ставки',
                legal_limit: `${MAX_DAILY_RATE.toFixed(2)}%`,
                actual_rate: `${dailyRatePercent.toFixed(2)}%`,
                excess: `${(dailyRatePercent - MAX_DAILY_RATE).toFixed(2)}%`,
            });
        }

        // Check 2: Total payment
        if (totalPayment > principal * MAX_TOTAL_MULTIPLIER) {
             violations.push({
                type: 'Перевищення загальної суми виплат',
                legal_limit: `${(principal * MAX_TOTAL_MULTIPLIER).toFixed(2)} грн (2x від тіла кредиту)`,
                actual_rate: `${totalPayment.toFixed(2)} грн`,
                excess: '',
                excess_amount: `${(totalPayment - principal * MAX_TOTAL_MULTIPLIER).toFixed(2)} грн`,
            });
        }

        const isLawful = violations.length === 0;

        // Simulate network delay for a better UX
        setTimeout(() => {
            setAnalysisResult({
                is_lawful: isLawful,
                violations: violations,
                recommended_action: isLawful
                    ? 'Договір відповідає основним вимогам законодавства щодо відсоткових ставок та максимальної переплати.'
                    : 'Рекомендується оскаржити умови договору. Ви можете згенерувати чернетку скарги до НБУ на основі цього аналізу.',
            });
            setIsAnalyzing(false);
        }, 1000);
    };

    const handleGenerateComplaint = async () => {
        if (!analysisResult || !analysisPrincipal || !analysisDailyRate || !analysisTerm) {
            setComplaintError("Недостатньо даних для створення скарги.");
            return;
        }

        setIsGeneratingComplaint(true);
        setComplaintDraft('');
        setComplaintError('');

        try {
            const principal = parseFloat(analysisPrincipal);
            const dailyRateDecimal = parseFloat(analysisDailyRate) / 100;
            const term = parseInt(analysisTerm, 10);
            const totalPayment = principal * (1 + dailyRateDecimal * term);

            const loanDetails: LoanDetails = {
                principal: analysisPrincipal,
                dailyRate: analysisDailyRate,
                termDays: analysisTerm,
                totalPayment: totalPayment.toFixed(2),
            };

            const draft = await generateComplaintDraft(loanDetails, analysisResult);
            setComplaintDraft(draft);
        } catch (error) {
            console.error("Failed to generate complaint draft:", error);
            setComplaintError("Під час створення скарги сталася помилка. Спробуйте ще раз.");
        } finally {
            setIsGeneratingComplaint(false);
        }
    };

     const handleCopy = () => {
        if (!complaintDraft) return;
        navigator.clipboard.writeText(complaintDraft);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };
    
    return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <h1 className="text-3xl font-bold text-center mb-6">Калькулятор та Аналізатор Кредиту</h1>
        
        {/* Loan Calculator Section */}
        <div className="max-w-lg mx-auto bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-lg shadow-md mb-8">
            <h2 className="text-2xl font-bold text-center mb-4">Розрахуйте свій кредит</h2>
            <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
                Перевірте умови вашого кредиту. Введіть дані, щоб розрахувати загальну виплату.
            </p>
            <form onSubmit={handleCalculate} className="space-y-4">
                <div>
                    <label htmlFor="calcPrincipal" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Сума кредиту (грн)</label>
                    <input type="number" id="calcPrincipal" value={calcPrincipal} onChange={(e) => setCalcPrincipal(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm" placeholder="Наприклад: 3000" required />
                </div>
                <div>
                    <label htmlFor="calcDailyRate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Денна відсоткова ставка (%)</label>
                    <input type="number" id="calcDailyRate" step="0.01" value={calcDailyRate} onChange={(e) => setCalcDailyRate(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm" placeholder="Наприклад: 1.9" required />
                </div>
                <div>
                    <label htmlFor="calcTermDays" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Термін кредиту (днів)</label>
                    <input type="number" id="calcTermDays" value={calcTermDays} onChange={(e) => setCalcTermDays(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm" placeholder="Наприклад: 14" required />
                </div>
                <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    Розрахувати
                </button>
            </form>
            {calcError && <p className="mt-4 text-center text-red-500">{calcError}</p>}
            {calcResult && (
                <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <h3 className="text-lg font-semibold text-center mb-2">Результат розрахунку:</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-300">Денна ставка:</span><span className="font-bold">{calcResult.dailyRatePercent.toFixed(2)}%</span></div>
                        <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-300">Загальна сума до сплати:</span><span className="font-bold text-blue-600 dark:text-blue-400">{calcResult.totalPayment.toFixed(2)} грн</span></div>
                    </div>
                </div>
            )}
        </div>

        {/* AI Analyzer Section */}
        <div className="mt-8 max-w-lg mx-auto bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-lg shadow-md">
             <h2 className="text-2xl font-bold text-center mb-4">AI Аналізатор Договору</h2>
             <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
                Введіть дані вашого кредиту, щоб перевірити його на відповідність законодавству України.
            </p>
            <form onSubmit={handleAnalyze} className="space-y-4">
                 <div>
                    <label htmlFor="analysisPrincipal" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Сума кредиту (грн)</label>
                    <input type="number" id="analysisPrincipal" value={analysisPrincipal} onChange={(e) => setAnalysisPrincipal(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm" placeholder="Наприклад: 3000" required />
                </div>
                <div>
                    <label htmlFor="analysisDailyRate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Денна відсоткова ставка (%)</label>
                    <input type="number" id="analysisDailyRate" step="0.01" value={analysisDailyRate} onChange={(e) => setAnalysisDailyRate(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm" placeholder="Наприклад: 1.9" required />
                </div>
                <div>
                    <label htmlFor="analysisTerm" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Термін кредиту (днів)</label>
                    <input type="number" id="analysisTerm" value={analysisTerm} onChange={(e) => setAnalysisTerm(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm" placeholder="Наприклад: 14" required />
                </div>
                <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50" disabled={isAnalyzing}>
                    {isAnalyzing ? 'Аналізуємо...' : 'Проаналізувати за допомогою AI'}
                </button>
            </form>
            {analysisError && <p className="mt-4 text-center text-red-500">{analysisError}</p>}
             {analysisResult && (
                <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <h3 className="text-lg font-semibold text-center mb-3">Результат аналізу:</h3>
                    <div className={`text-center p-2 rounded-md mb-4 ${analysisResult.is_lawful ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'}`}>
                        <span className="font-bold text-lg">{analysisResult.is_lawful ? '✅ Законно' : '❌ Незаконно'}</span>
                    </div>

                    {!analysisResult.is_lawful && (
                        <div className="mb-4">
                            <h4 className="font-semibold mb-2">Виявлені порушення:</h4>
                            <ul className="list-disc list-inside space-y-2 text-sm">
                                {analysisResult.violations.map((v, index) => (
                                    <li key={index}>
                                        <span className="font-semibold">{v.type}</span>
                                        <div className="pl-4 text-gray-600 dark:text-gray-400">
                                            <div>Законний ліміт: <span className="font-mono">{v.legal_limit}</span></div>
                                            <div>Фактично: <span className="font-mono">{v.actual_rate}</span></div>
                                            {v.excess_amount && <div>Перевищення: <span className="font-mono">{v.excess_amount}</span></div>}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                     <div>
                        <h4 className="font-semibold mb-2">Рекомендовані дії:</h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{analysisResult.recommended_action}</p>
                    </div>

                    {!analysisResult.is_lawful && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                             <button
                                onClick={handleGenerateComplaint}
                                disabled={isGeneratingComplaint}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                            >
                                {isGeneratingComplaint ? 'Генеруємо...' : '📝 Згенерувати скаргу до НБУ'}
                            </button>
                             {isGeneratingComplaint && <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">Зачекайте, AI готує вашу скаргу...</p>}
                             {complaintError && <p className="mt-4 text-center text-red-500">{complaintError}</p>}
                             {complaintDraft && (
                                <div className="mt-4">
                                    <h4 className="font-semibold mb-2">Чернетка вашої скарги:</h4>
                                    <div className="relative">
                                        <textarea
                                            readOnly
                                            value={complaintDraft}
                                            className="w-full h-80 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm font-mono shadow-inner"
                                            aria-label="Generated complaint draft"
                                        />
                                        <button
                                            onClick={handleCopy}
                                            className="absolute top-2 right-2 bg-gray-200 dark:bg-gray-600 p-1.5 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                                            aria-label="Copy complaint to clipboard"
                                        >
                                           {copied ? 
                                           <span className="text-xs px-1">Зкопійовано!</span> :
                                           <ClipboardCopyIcon className="h-5 w-5" />
                                           }
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Зкопіюйте цей текст та надішліть до НБУ. Не забудьте вказати ваші особисті дані.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
             )}
        </div>
    </div>
    );
};

interface DashboardPageProps {
  theme: 'light' | 'dark';
}

const DashboardPage: React.FC<DashboardPageProps> = ({ theme }) => {
    const [mfoData, setMfoData] = useState<MfoViolationData[]>([]);
    const [violationTypeData, setViolationTypeData] = useState<ViolationTypeData[]>([]);
    const [regionalData, setRegionalData] = useState<RegionalData[]>([]);

    useEffect(() => {
        setMfoData(getMfoViolationData());
        setViolationTypeData(getViolationTypeData());
        setRegionalData(getRegionalData());
    }, []);

    const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];
    const tickColor = theme === 'dark' ? '#A0AEC0' : '#4A5568'; // gray-400 dark, gray-700 light

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold text-center mb-2">Панель Моніторингу</h1>
            <p className="text-center text-gray-600 dark:text-gray-300 mb-8">
                Статистика порушень з боку мікрофінансових організацій в Україні (демонстраційні дані).
            </p>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md col-span-1 xl:col-span-2">
                    <h2 className="text-xl font-semibold mb-4 text-center">Порушення за МФО</h2>
                    <div style={{ width: '100%', height: 400 }}>
                        <ResponsiveContainer>
                            <BarChart data={mfoData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#4A5568' : '#E2E8F0'} />
                                <XAxis dataKey="name" tick={{ fill: tickColor, fontSize: 12 }} />
                                <YAxis tick={{ fill: tickColor, fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: theme === 'dark' ? '#2D3748' : '#FFFFFF',
                                        borderColor: theme === 'dark' ? '#4A5568' : '#E2E8F0',
                                    }}
                                />
                                <Legend wrapperStyle={{fontSize: "14px"}}/>
                                <Bar dataKey="violations" name="Кількість порушень" fill="#3B82F6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4 text-center">Розподіл за типом порушень</h2>
                    <div style={{ width: '100%', height: 400 }}>
                         <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={violationTypeData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={120}
                                    fill="#8884d8"
                                    dataKey="value"
                                    nameKey="name"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    
                                >
                                    {violationTypeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                 <Tooltip
                                    contentStyle={{
                                        backgroundColor: theme === 'dark' ? '#2D3748' : '#FFFFFF',
                                        borderColor: theme === 'dark' ? '#4A5568' : '#E2E8F0',
                                    }}
                                />
                                <Legend wrapperStyle={{fontSize: "14px"}}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4 text-center">Порушення за областями</h2>
                    <div style={{ width: '100%', height: 400 }}>
                         <ResponsiveContainer>
                            <BarChart data={regionalData} layout="vertical" margin={{ top: 5, right: 20, left: 50, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#4A5568' : '#E2E8F0'} />
                                <XAxis type="number" tick={{ fill: tickColor, fontSize: 12 }} />
                                <YAxis dataKey="region" type="category" tick={{ fill: tickColor, fontSize: 12 }} width={100}/>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: theme === 'dark' ? '#2D3748' : '#FFFFFF',
                                        borderColor: theme === 'dark' ? '#4A5568' : '#E2E8F0',
                                    }}
                                />
                                <Legend wrapperStyle={{fontSize: "14px"}}/>
                                <Bar dataKey="cases" name="Кількість справ" fill="#10B981" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ResourcesPage: React.FC = () => (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <h1 className="text-3xl font-bold text-center mb-6">Корисні Ресурси</h1>
        <div className="max-w-3xl mx-auto space-y-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-2">Законодавство</h2>
                <p>Посилання на закони України, що регулюють діяльність МФО.</p>
            </div>
             <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-2">Шаблони скарг</h2>
                <p>Готові шаблони заяв та скарг до Національного банку України та інших установ.</p>
            </div>
             <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-2">Контакти регуляторів</h2>
                <p>Контактна інформація НБУ та інших органів, що контролюють ринок фінансових послуг.</p>
            </div>
        </div>
    </div>
);

const App: React.FC = () => {
    const [currentPage, setCurrentPage] = useState<Page>('home');
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        if (typeof window === 'undefined') {
            return 'light';
        }
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    const renderPage = () => {
        switch (currentPage) {
            case 'home':
                return <HomePage />;
            case 'analyzer':
                return <AnalyzerPage />;
            case 'dashboard':
                return <DashboardPage theme={theme} />;
            case 'resources':
                return <ResourcesPage />;
            default:
                return <HomePage />;
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
            <Header currentPage={currentPage} setCurrentPage={setCurrentPage} theme={theme} toggleTheme={toggleTheme} />
            <main className="flex-grow">
                {renderPage()}
            </main>
            <Footer />
        </div>
    );
};

export default App;