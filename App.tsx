
import React, { useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import Header from './components/Header';
import Footer from './components/Footer';
import { Page, AnalysisResult, Violation, LoanDetails, MfoViolationData, ViolationTypeData, RegionalData } from './types';
import { generateComplaintDraft } from './services/geminiService';
import { ShieldCheckIcon, SparklesIcon } from './components/icons';


// Mock Data for Dashboard
const mfoViolationData: MfoViolationData[] = [
  { name: 'CreditPlus', violations: 480 },
  { name: 'MoneyVeo', violations: 450 },
  { name: 'MyCredit', violations: 410 },
  { name: 'SOS Credit', violations: 380 },
  { name: 'AlexCredit', violations: 350 },
  { name: 'CreditKasa', violations: 320 },
  { name: 'Miloan', violations: 290 },
  { name: 'E-Groshi', violations: 250 },
  { name: 'Global Credit', violations: 220 },
  { name: 'ShvidkoGroshi', violations: 190 },
];

const violationTypeData: ViolationTypeData[] = [
  { name: 'Excessive Daily Rate (>1%)', value: 55 },
  { name: 'Total Overpayment (>2x Principal)', value: 30 },
  { name: 'Hidden Fees', value: 10 },
  { name: 'Other Contract Violations', value: 5 },
];

const regionalData: RegionalData[] = [
    { region: 'Kyiv City', cases: 1200 },
    { region: 'Dnipropetrovsk', cases: 850 },
    { region: 'Odesa', cases: 780 },
    { region: 'Kharkiv', cases: 750 },
    { region: 'Lviv', cases: 620 },
]

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

// --- Page Components ---

const HomePage: React.FC<{ setCurrentPage: (page: Page) => void }> = ({ setCurrentPage }) => (
  <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
    <ShieldCheckIcon className="mx-auto h-16 w-16 text-blue-600 dark:text-blue-400" />
    <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl lg:text-6xl">
      MFO Shield Ukraine
    </h1>
    <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500 dark:text-gray-300">
      Ваш AI-помічник для захисту прав споживачів від хижацьких практик мікрофінансових організацій.
    </p>
    <div className="mt-8">
      <button
        onClick={() => setCurrentPage('analyzer')}
        className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Перевірити кредитний договір
      </button>
    </div>
    <div className="mt-20">
      <h2 className="text-3xl font-bold mb-10">Як це працює?</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <div className="flex items-center">
                <span className="text-3xl font-bold text-blue-600 dark:text-blue-400 mr-4">1</span>
                <h3 className="text-xl font-semibold">Введіть дані</h3>
            </div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Заповніть просту форму з ключовими умовами вашого кредитного договору.</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <div className="flex items-center">
                <span className="text-3xl font-bold text-blue-600 dark:text-blue-400 mr-4">2</span>
                <h3 className="text-xl font-semibold">Отримайте аналіз</h3>
            </div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Наш AI миттєво проаналізує дані на відповідність законодавству України.</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <div className="flex items-center">
                <span className="text-3xl font-bold text-blue-600 dark:text-blue-400 mr-4">3</span>
                <h3 className="text-xl font-semibold">Дійте впевнено</h3>
            </div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Отримайте рекомендації та згенеруйте проект скарги до НБУ в один клік.</p>
        </div>
      </div>
    </div>
  </div>
);

const LoanAnalyzerPage: React.FC = () => {
    const [loanDetails, setLoanDetails] = useState<LoanDetails>({
        principal: '10000',
        dailyRate: '1.5',
        termDays: '30',
        totalPayment: '14500'
    });
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [complaintDraft, setComplaintDraft] = useState('');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLoanDetails(prev => ({ ...prev, [name]: value }));
    };
    
    const handleAnalyze = () => {
        setIsLoading(true);
        setResult(null);
        setComplaintDraft('');

        const principal = parseFloat(loanDetails.principal);
        const dailyRatePercent = parseFloat(loanDetails.dailyRate);
        const totalPayment = parseFloat(loanDetails.totalPayment);
        
        const violations: Violation[] = [];
        const dailyRate = dailyRatePercent / 100;

        // Check 1: Daily rate > 1%
        if (dailyRate > 0.01) {
            violations.push({
                type: 'Перевищення денної ставки',
                legal_limit: '1%',
                actual_rate: `${(dailyRate * 100).toFixed(2)}%`,
                excess: `${((dailyRate - 0.01) * 100).toFixed(2)}%`,
            });
        }
        
        // Check 2: Total payment > 2x principal
        if (totalPayment / principal > 2) {
            violations.push({
                type: 'Перевищення загальної суми переплати',
                legal_limit: `${(principal * 2).toFixed(2)} UAH (2x від тіла кредиту)`,
                actual_rate: `${totalPayment.toFixed(2)} UAH`,
                excess: `${(totalPayment - (principal * 2)).toFixed(2)} UAH`,
            });
        }

        setTimeout(() => {
            setResult({
                is_lawful: violations.length === 0,
                violations,
                recommended_action: violations.length > 0
                    ? 'Рекомендується оскаржити умови договору через НБУ/суд.'
                    : 'Договір відповідає основним вимогам законодавства.',
            });
            setIsLoading(false);
        }, 1000);
    };

    const handleGenerateDraft = async () => {
        if (!result) return;
        setIsGenerating(true);
        const draft = await generateComplaintDraft(loanDetails, result);
        setComplaintDraft(draft);
        setIsGenerating(false);
    }
    
    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h1 className="text-3xl font-bold text-center mb-2">AI Аналізатор Кредитного Договору</h1>
            <p className="text-center text-gray-600 dark:text-gray-400 mb-8">Введіть дані вашого кредиту для перевірки на відповідність закону.</p>
            
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4">Дані кредиту</h2>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="principal" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Сума кредиту (тіло), грн</label>
                            <input type="number" name="principal" id="principal" value={loanDetails.principal} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="dailyRate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Денна відсоткова ставка, %</label>
                            <input type="number" name="dailyRate" id="dailyRate" step="0.1" value={loanDetails.dailyRate} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="termDays" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Термін кредиту, днів</label>
                            <input type="number" name="termDays" id="termDays" value={loanDetails.termDays} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="totalPayment" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Повна сума до сплати, грн</label>
                            <input type="number" name="totalPayment" id="totalPayment" value={loanDetails.totalPayment} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>
                        <button onClick={handleAnalyze} disabled={isLoading} className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300">
                           {isLoading ? 'Аналізуємо...' : 'Провести аналіз'}
                        </button>
                    </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4">Результати аналізу</h2>
                    {isLoading && <div className="text-center">Аналіз триває...</div>}
                    {result && (
                        <div className={`p-4 rounded-md ${result.is_lawful ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                            <h3 className={`text-lg font-bold ${result.is_lawful ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                                {result.is_lawful ? 'Порушень не виявлено' : 'Виявлено порушення!'}
                            </h3>
                            <p className={`mt-2 text-sm ${result.is_lawful ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                                {result.recommended_action}
                            </p>
                            {!result.is_lawful && (
                                <div className="mt-4 space-y-2">
                                    {result.violations.map((v, i) => (
                                        <div key={i} className="text-sm border-t border-red-200 dark:border-red-700 pt-2">
                                            <p className="font-semibold">{v.type}</p>
                                            <p>Ліміт: <span className="font-mono">{v.legal_limit}</span></p>
                                            <p>Фактично: <span className="font-mono">{v.actual_rate}</span></p>
                                        </div>
                                    ))}
                                    <button onClick={handleGenerateDraft} disabled={isGenerating} className="mt-4 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400">
                                       <SparklesIcon className="w-5 h-5 mr-2" />
                                       {isGenerating ? 'Генеруємо...' : 'Згенерувати проект скарги з AI'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    {complaintDraft && (
                        <div className="mt-4">
                            <h3 className="text-lg font-semibold mb-2">Проект скарги:</h3>
                            <textarea readOnly value={complaintDraft} rows={15} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-sm"></textarea>
                            <button onClick={() => navigator.clipboard.writeText(complaintDraft)} className="mt-2 text-sm text-blue-600 hover:underline">Копіювати текст</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const DashboardPage: React.FC = () => (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-center mb-8">Публічна Панель Моніторингу</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">Топ-10 МФО за кількістю порушень</h2>
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={mfoViolationData} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="violations" fill="#3B82F6" name="Кількість порушень"/>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">Розподіл типів порушень</h2>
                 <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                        <Pie
                            data={violationTypeData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={150}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                            {violationTypeData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            </div>
             <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md lg:col-span-2">
                <h2 className="text-xl font-semibold mb-4">Географічний розподіл скарг</h2>
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={regionalData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="region" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="cases" fill="#10B981" name="Кількість справ" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    </div>
);

const ResourcesPage: React.FC = () => (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-center mb-8">Корисні Ресурси</h1>
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-semibold mb-4">Юридичні шаблони</h2>
                <ul className="space-y-3 list-disc list-inside text-blue-600 dark:text-blue-400">
                    <li><a href="#" className="hover:underline">Шаблон скарги до Національного банку України (НБУ)</a></li>
                    <li><a href="#" className="hover:underline">Шаблон звернення до Фінансового омбудсмена</a></li>
                    <li><a href="#" className="hover:underline">Шаблон позовної заяви до суду</a></li>
                </ul>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-semibold mb-4">Посібники та інструкції</h2>
                 <ul className="space-y-3 list-disc list-inside text-blue-600 dark:text-blue-400">
                    <li><a href="#" className="hover:underline">Посібник користувача MFO Shield</a></li>
                    <li><a href="#" className="hover:underline">Часті запитання (FAQ)</a></li>
                </ul>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-semibold mb-4">Спільнота та підтримка</h2>
                 <ul className="space-y-3 list-disc list-inside text-blue-600 dark:text-blue-400">
                    <li><a href="https://github.com/mfo-shield-ukraine" target="_blank" rel="noopener noreferrer" className="hover:underline">GitHub: наш відкритий код</a></li>
                    <li><a href="#" className="hover:underline">Telegram: канал підтримки спільноти</a></li>
                    <li><a href="mailto:info@mfo-shield.gov.ua" className="hover:underline">Email: Технічна підтримка та запити</a></li>
                </ul>
            </div>
        </div>
    </div>
);


const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home');

  const renderPage = () => {
    switch (currentPage) {
      case 'analyzer':
        return <LoanAnalyzerPage />;
      case 'dashboard':
        return <DashboardPage />;
      case 'resources':
        return <ResourcesPage />;
      case 'home':
      default:
        return <HomePage setCurrentPage={setCurrentPage} />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <main className="flex-grow">
        {renderPage()}
      </main>
      <Footer />
    </div>
  );
};

export default App;
