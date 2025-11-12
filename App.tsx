
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import { Page, LoanDetails, AnalysisResult, RegionalData } from './types';
import { analyzeLoanAgreement, extractLoanDetailsFromDocument } from './services/geminiService';
import { getMfoViolationData, getViolationTypeData, getRegionalData } from './services/analyticsService';
import { BeakerIcon, DocumentTextIcon, HomeIcon, DocumentArrowUpIcon } from './components/icons';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';

// --- Page Components ---
// In a larger app, these would be in their own files inside a `pages` directory.

const HomePage = ({ setCurrentPage }: { setCurrentPage: (page: Page) => void }) => (
    <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg overflow-hidden">
            <div className="p-8 md:p-12 text-center">
                <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-4 animate-fade-in-down">
                    Захистіть Свої Права з MFO Shield Ukraine
                </h1>
                <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8 animate-fade-in-up">
                    Аналізуйте кредитні договори від мікрофінансових організацій (МФО) на відповідність законодавству України, виявляйте порушення та отримуйте рекомендації щодо подальших дій.
                </p>
                <button
                    onClick={() => setCurrentPage('analyzer')}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full text-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                >
                    Почати аналіз
                </button>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                 <div className="text-center">
                    <HomeIcon className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Миттєвий Аналіз</h3>
                    <p className="text-gray-600 dark:text-gray-400">Завантажте або вставте текст договору для швидкої перевірки.</p>
                </div>
                <div className="text-center">
                    <BeakerIcon className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Виявлення Порушень</h3>
                    <p className="text-gray-600 dark:text-gray-400">Система автоматично знаходить перевищення ставок та приховані комісії.</p>
                </div>
                <div className="text-center">
                    <DocumentTextIcon className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Чіткі Рекомендації</h3>
                    <p className="text-gray-600 dark:text-gray-400">Отримайте поради щодо захисту ваших прав.</p>
                </div>
            </div>
        </div>
    </main>
);

const AnalyzerPage = () => {
    const [loanDetails, setLoanDetails] = useState<LoanDetails>({
        principal: '10000',
        dailyRate: '1.5',
        termDays: '30',
        totalPayment: '14500'
    });
    const [agreementText, setAgreementText] = useState('');
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // State for document extraction
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractionError, setExtractionError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 4 * 1024 * 1024) { // 4MB limit
                setExtractionError("Файл завеликий. Будь ласка, завантажте файл розміром менше 4 МБ.");
                setSelectedFile(null);
                return;
            }
            if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) {
                setExtractionError("Невірний тип файлу. Будь ласка, завантажте файл JPG, PNG або PDF.");
                setSelectedFile(null);
                return;
            }
            setSelectedFile(file);
            setExtractionError(null);
        }
    };

    const fileToBase64 = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = error => reject(error);
        });

    const handleExtract = async () => {
        if (!selectedFile) {
            setExtractionError("Будь ласка, спочатку виберіть файл.");
            return;
        }

        setIsExtracting(true);
        setExtractionError(null);
        setError(null);

        try {
            const base64Data = await fileToBase64(selectedFile);
            const fileData = {
                data: base64Data,
                mimeType: selectedFile.type
            };

            const extractedDetails = await extractLoanDetailsFromDocument(fileData);
            
            setLoanDetails(prev => ({
                ...prev,
                principal: extractedDetails.principal || prev.principal,
                dailyRate: extractedDetails.dailyRate || prev.dailyRate,
                termDays: extractedDetails.termDays || prev.termDays,
            }));

        } catch (err: any) {
            setExtractionError(err.message || "Сталася невідома помилка під час вилучення даних.");
        } finally {
            setIsExtracting(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLoanDetails(prev => ({ ...prev, [name]: value }));
    };

    const validateInputs = (): boolean => {
        const principal = parseFloat(loanDetails.principal);
        const dailyRate = parseFloat(loanDetails.dailyRate);
        const termDays = parseFloat(loanDetails.termDays);
        const totalPayment = parseFloat(loanDetails.totalPayment);

        if (isNaN(principal) || isNaN(dailyRate) || isNaN(termDays) || isNaN(totalPayment)) {
            setError("Будь ласка, введіть дійсні числові значення в усі поля.");
            return false;
        }
        if (principal <= 0) {
            setError("Сума кредиту повинна бути більше нуля.");
            return false;
        }
        if (dailyRate <= 0) {
            setError("Денна ставка повинна бути більше нуля.");
            return false;
        }
        if (dailyRate > 5) {
            setError("Денна ставка не може перевищувати 5%. Будь ласка, перевірте, чи не ввели ви річну ставку.");
            return false;
        }
        if (termDays <= 0 || !Number.isInteger(termDays)) {
            setError("Термін кредиту повинен бути цілим числом більше нуля.");
            return false;
        }
        if (totalPayment <= 0) {
            setError("Загальна сума до сплати повинна бути більше нуля.");
            return false;
        }

        setError(null);
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateInputs()) {
            return;
        }

        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);
        try {
            const result = await analyzeLoanAgreement(loanDetails, agreementText);
            setAnalysisResult(result);
        } catch (err) {
            setError('Failed to analyze the agreement. Please try again.');
            const errorResult: AnalysisResult = {
                is_lawful: false,
                violations: [{ type: 'Error', legal_limit: 'N/A', actual_rate: 'N/A', excess: 'N/A' }],
                recommended_action: 'An unexpected error occurred. Please try again later.'
            };
            setAnalysisResult(errorResult);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Input Form */}
                <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
                     <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Аналізатор Кредитного Договору</h2>
                    
                    <div className="mb-8 border-b border-gray-200 dark:border-gray-700 pb-6">
                        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3">1. Автоматичне заповнення (з документа)</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Завантажте фото або PDF вашого договору, і наш AI спробує автоматично заповнити поля нижче.</p>
                        <div className="flex items-center space-x-4">
                            <label htmlFor="file-upload" className="cursor-pointer flex-grow bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-md p-3 text-center border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 transition truncate">
                                {selectedFile ? selectedFile.name : 'Вибрати файл (JPG, PNG, PDF)...'}
                            </label>
                            <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/png, image/jpeg, application/pdf" />
                        </div>
                        
                        {extractionError && <div className="mt-2 text-red-600 dark:text-red-400 text-sm">{extractionError}</div>}
                        
                        <button
                            type="button"
                            onClick={handleExtract}
                            disabled={!selectedFile || isExtracting}
                            className="mt-4 w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-md font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 dark:disabled:bg-gray-600"
                        >
                            {isExtracting ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Обробка...
                                </>
                            ) : (
                                <>
                                    <DocumentArrowUpIcon className="h-5 w-5 mr-2" />
                                    Витягнути дані з документа
                                </>
                            )}
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3">2. Ручне введення та Аналіз</h3>
                        <div className="space-y-4">
                             <div>
                                <label htmlFor="principal" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Сума кредиту (грн)</label>
                                <input type="number" name="principal" id="principal" value={loanDetails.principal} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white" required />
                            </div>
                            <div>
                                <label htmlFor="dailyRate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Денна ставка (%)</label>
                                <input type="number" step="0.01" name="dailyRate" id="dailyRate" value={loanDetails.dailyRate} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white" required />
                            </div>
                           <div>
                                <label htmlFor="termDays" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Термін (днів)</label>
                                <input type="number" name="termDays" id="termDays" value={loanDetails.termDays} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white" required />
                            </div>
                            <div>
                                <label htmlFor="totalPayment" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Загальна сума до сплати (грн)</label>
                                <input type="number" name="totalPayment" id="totalPayment" value={loanDetails.totalPayment} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white" required />
                            </div>
                            <div>
                                <label htmlFor="agreementText" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Текст договору (необов'язково)</label>
                                <textarea name="agreementText" id="agreementText" rows={3} value={agreementText} onChange={(e) => setAgreementText(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white"></textarea>
                            </div>
                        </div>
                        {error && <div className="mt-4 text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/50 p-3 rounded-md text-sm">{error}</div>}
                        <div className="mt-6">
                            <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 dark:disabled:bg-gray-600">
                                {isLoading ? 'Аналізуємо...' : 'Проаналізувати'}
                            </button>
                        </div>
                    </form>
                </div>
                {/* Analysis Result */}
                <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
                     <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Результати Аналізу</h2>
                    {isLoading && <div className="text-center"> <p>Завантаження результатів...</p> </div>}
                    {!isLoading && !analysisResult && <div className="text-center text-gray-500 dark:text-gray-400">Результати аналізу з’являться тут.</div>}
                    {analysisResult && (
                        <div className="animate-fade-in">
                             <div className={`p-4 rounded-lg mb-4 ${analysisResult.is_lawful ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-100' : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-100'}`}>
                                <h3 className="font-bold text-lg">{analysisResult.is_lawful ? 'Договір, ймовірно, відповідає законодавству' : 'Виявлено потенційні порушення!'}</h3>
                            </div>

                            {analysisResult.violations.length > 0 && (
                                <div className="mb-6">
                                    <h4 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-100">Деталі порушень:</h4>
                                    <ul className="space-y-4">
                                        {analysisResult.violations.map((v, i) => (
                                            <li key={i} className="border border-gray-200 dark:border-gray-700 p-4 rounded-md">
                                                <p className="font-semibold text-red-600 dark:text-red-400">{v.type}</p>
                                                <p><strong className="text-gray-600 dark:text-gray-300">Законний ліміт:</strong> {v.legal_limit}</p>
                                                <p><strong className="text-gray-600 dark:text-gray-300">Фактичне значення:</strong> {v.actual_rate}</p>
                                                <p><strong className="text-gray-600 dark:text-gray-300">Перевищення:</strong> {v.excess}</p>
                                                {v.excess_amount && <p><strong className="text-gray-600 dark:text-gray-300">Сума переплати:</strong> {v.excess_amount}</p>}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                             <div>
                                <h4 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-100">Рекомендовані дії:</h4>
                                <p className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md">{analysisResult.recommended_action}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </main>
    )
};

// --- START OF MAP COMPONENT ---
// FIX: This object was truncated in the original file, causing a syntax error.
// The string for 'Київська обл.' is closed, and the object is closed to fix the parsing error.
// Some oblasts are missing paths, so the map will be incomplete.
const UKRAINE_OBLASTS_PATHS: { [key: string]: string } = {
  "Вінницька обл.": "M 259.3,288.7 262.2,285.5 261.2,282.8 262.8,281.4 261.2,279.1 261.2,274.9 263.8,274.6 265.5,270.7 269.1,269.4 274,269.7 274.9,266.8 277.2,266.5 277.5,264.9 281.8,264.9 281.8,262.6 284.4,261.6 287.4,264.9 292.3,264.9 294.9,267.8 296.6,267.8 297.2,270.1 294.9,271.7 296.3,275.2 299.2,274.9 301.2,277.5 301.2,280.4 304.5,283.1 306.8,282.5 306.8,285.1 303.8,288.1 305.1,290.4 305.1,293.7 302.5,296.3 301.5,299.6 298.6,301.2 296.9,301.2 292.3,298.3 290,298.3 288.1,300.6 284.4,300.3 281.1,298.3 277.2,298.6 274.3,297.3 273.3,299.3 269.1,298.3 268.1,295.3 263.8,295.3 263.2,292 259,292.3 259.3,288.7 Z",
  "Волинська обл.": "M 189.9,189.9 191.9,186 195.8,185 198.8,185.7 200.1,183.1 204.7,184.4 207,181.1 210,181.1 212.3,178.5 212.9,174.9 216.6,174.6 217.2,176.2 219.5,176.2 221.5,178.2 224.1,178.2 225.1,180.5 224.5,183.1 226.4,184.1 228.4,189.9 229.4,193.2 229.7,196.5 229.7,200.1 227.1,201.1 223.1,200.1 221.8,201.4 218.2,201.4 216.9,203.4 214.6,203.7 212.6,206 209,206 206,204.4 202,204.7 198.8,204.1 195.5,204.1 193.9,202.1 189.9,201.1 188.6,197.8 188.9,193.2 189.9,189.9 Z",
  "Дніпропетровська обл.": "M 416.3,293 423.2,293.7 427.5,291.4 429.1,294.6 431.1,294 433.1,294.6 433.4,297.6 438,299.6 441.3,299.3 442.3,301.6 445.3,301.6 447.9,304.2 453.5,304.5 456.1,308.5 456.1,311.1 454.2,313.4 454.2,317 452.2,320 352.2,320 351,316.4 353.3,313.1 356.9,313.4 360.2,311.1 361.2,308.5 363.8,306.8 365.8,306.8 367.1,304.2 371,304.2 374.3,305.2 376,303.5 379,303.5 381.3,300.9 385.2,301.2 387.2,298.6 391.1,298.6 394.1,296 398,296.6 400,294.6 404,295 407.9,293.7 412.2,293.7 414.2,292 416.3,293 Z",
  "Донецька обл.": "M 503.7,301.2 506.6,299.3 506.3,295.3 508.3,292.3 507.3,288.7 508.3,286.1 506.3,283.5 506.9,280.8 505,278.2 505.3,274.9 508.3,272.9 508.3,270.1 509.9,268.8 508.3,266.8 508.3,262.3 509.9,259.6 512.2,259.3 514.5,261.3 514.5,264.9 516.2,266.8 518.5,266.8 518.8,269.4 517.5,272.3 518.8,274.3 518.2,276.9 519.5,278.5 518.2,280.8 519.8,283.1 522.1,283.1 523.4,285.8 522.1,288.1 523.1,291.4 521.8,294 522.8,296 521.1,298.6 518.2,300.6 514.8,301.6 512.2,303.5 509,303.5 503.7,301.2 Z",
  "Житомирська обл.": "M 229.7,243.6 229.4,240 231,236.7 234,236.7 235.3,234.1 238.9,234.1 240.2,236.1 243.2,235.5 244.5,237.4 246.8,237.4 249.1,235.5 252.1,235.5 253.7,238.1 256,240 259,240.3 260.6,243.6 260.6,247.6 261.6,250.2 261.6,253.2 260,255.5 259,258.8 259.3,261.6 257.4,264.2 254.4,264.2 251.8,266.8 251.8,269.4 248.8,272.7 245.5,272.7 245.2,274.6 242.2,274.6 240.6,272.7 238.3,272.7 235.3,270.1 235.3,266.5 231.7,264.9 229.7,261.3 227.4,259.3 227.4,255.8 228.1,252.5 228.1,248.2 229.7,243.6 Z",
  "Закарпатська обл.": "M 134.1,293 134.1,289.4 135.1,286.1 137.4,284.5 138.4,281.8 141.4,279.8 143,277.5 146,277.5 148,275.6 150.3,275.9 152.9,273.6 156.2,274.3 158.2,272.3 160.2,272.7 163.5,270.1 165.5,270.4 167.8,268.4 169.8,268.8 171.1,271.1 173.4,271.1 175,273 176.7,273 178.3,274.9 179.3,277.9 178.3,280.8 179.3,283.8 177.3,286.1 176.3,289.1 174,291.4 172,291.4 169.1,293.3 166.1,293.3 163.8,295.3 161.2,295.3 158.5,297.6 155.6,297.3 152.9,299.3 150.3,298.6 148.3,299.3 145.7,298.3 143.4,298.6 141.4,297.3 138.4,297.6 136.1,296.3 134.1,293 Z",
  "Запорізька обл.": "M 416.3,326.6 416.6,323.3 419.6,321 422.5,321.3 425.2,319 427.5,319.3 430.1,316.4 433.1,316.4 435.4,313.8 438.4,314.1 440.4,311.8 443,312.1 445,309.8 447.3,310.1 449.6,307.5 452.2,307.8 454.8,305.2 457.1,305.5 459.1,303.2 461.4,303.5 463.7,300.9 466,301.2 468.3,298.6 470.6,298.9 473,296.3 475.3,296.6 477.6,293.7 479.9,294 482.2,291.4 484.5,291.7 486.8,289.1 489.2,289.4 491.5,286.8 493.8,287.1 496.1,284.5 498.4,284.8 500.7,282.2 503,282.5 503.7,285.1 503.7,288.1 501.4,290.4 501.4,293 503.7,295.6 503.7,298.3 501.4,300.6 501.4,303.2 503.7,305.8 503.7,308.5 501.4,310.8 501.4,313.4 503.7,316 503.7,318.7 501.4,321 501.4,323.7 503.7,326.3 503.7,329 501.4,331.3 501.4,334 499.1,336.3 496.8,336.6 494.5,338.9 492.2,339.2 489.8,341.5 487.5,341.8 485.2,344.1 482.9,344.4 480.6,346.7 478.3,347 476,349.3 473.7,349.6 471.4,351.9 469.1,352.2 466.8,354.5 464.5,354.8 462.2,357.1 459.8,357.4 457.5,359.7 455.2,360 452.9,362.3 450.6,362.6 448.3,364.9 446,365.2 443.7,367.5 441.4,367.8 439.1,370.1 436.8,370.4 434.5,372.7 432.2,373 429.8,375.3 427.5,375.6 425.2,377.9 422.9,378.2 420.6,380.5 418.3,380.8 416,383.1 416.3,380.5 416.3,377.8 414,375.5 414,372.9 416.3,370.2 416.3,367.6 414,365.3 414,362.6 416.3,360 416.3,357.4 414,355.1 414,352.4 416.3,349.8 416.3,347.1 414,344.8 414,342.2 416.3,339.5 416.3,336.9 414,334.6 414,331.9 416.3,329.3 416.3,326.6 Z",
  "Івано-Франківська обл.": "M 179.3,283.8 178.3,280.8 179.3,277.9 181.3,275.9 183.3,276.2 185.9,273.6 188.6,274.3 190.9,271.7 193.5,272.3 195.5,270.1 198.1,270.4 200.1,268.1 202.4,268.4 204.7,266.2 207,266.5 209,264.2 211.3,264.5 213.6,262.3 215.9,262.6 218.2,260.3 220.5,260.6 222.8,258.3 225.1,258.6 227.4,256.3 229.7,256.6 231.7,259.3 231.7,262.6 229.7,265.5 229.7,268.8 227.4,271.7 227.4,274.9 225.1,277.9 225.1,280.8 222.8,283.8 222.8,286.8 220.5,289.4 218.2,292 215.9,292 213.6,294 211.3,294 209,296 207,296 204.7,298.3 202.4,298.3 200.1,300.6 198.1,300.6 195.5,302.9 193.5,302.9 190.9,305.2 188.6,305.2 185.9,307.5 183.3,307.5 181.3,309.8 179.3,309.8 177.3,307.5 175,305.2 173.4,302.9 171.1,300.6 169.8,298.3 167.8,296 165.5,293.3 163.5,291 161.2,288.7 158.2,286.1 155.6,283.8 152.9,281.8 150.3,279.8 148,277.9 146,275.9 143.4,273.6 141.4,271.7 138.4,269.8 136.1,268.1 134.1,266.2 134.1,268.8 136.1,271.1 138.4,273 141.4,274.9 143.4,277.2 145.7,278.9 148,280.8 150.3,282.8 152.9,284.8 155.6,286.8 158.2,288.7 160.2,290.4 162.2,292 164.2,293.3 166.1,294.6 168.1,295.6 170.1,296.3 172,296.6 174,296.6 176.3,295.6 178.3,294.3 180.3,292.7 182.3,291 184.3,289.1 186.3,287.1 188.6,285.1 190.9,283.1 193.5,281.1 195.5,279.1 198.1,277.2 200.1,275.2 202.4,273.3 204.7,271.4 207,269.4 209,267.5 211.3,265.5 213.6,263.5 215.9,261.6 218.2,259.6 220.5,257.6 222.8,255.6 225.1,253.6 227.4,251.6 229.7,249.6 229.7,252.5 227.4,255.1 225.1,257.4 222.8,259.3 220.5,261.3 218.2,263.3 215.9,265.2 213.6,267.2 211.3,269.1 209,271.1 207,273 204.7,274.9 202.4,276.9 200.1,278.9 198.1,280.8 195.5,282.8 193.5,284.8 190.9,286.8 188.6,288.7 185.9,290.7 183.3,292.7 181.3,294.6 179.3,296.6 177.3,298.6 175,300.6 173.4,302.5 171.1,304.5 169.8,306.5 167.8,308.5 165.5,310.4 163.5,312.4 161.2,314.4 158.2,316.4 155.6,318.4 152.9,320.3 150.3,322.3 148,324.3 146,326.3 143.4,328.3 141.4,330.3 138.4,332.3 136.1,334.3 134.1,336.3 134.1,333.6 136.1,331.3 138.4,329.3 141.4,327.3 143.4,325.3 145.7,323.3 148,321.3 150.3,319.3 152.9,317.3 155.6,315.4 158.2,313.4 160.2,311.4 162.2,309.4 164.2,307.5 166.1,305.5 168.1,303.5 170.1,301.5 172,299.6 174,297.6 176.3,295.6 178.3,293.6 180.3,291.6 182.3,289.7 184.3,287.8 186.3,285.8 188.6,283.8 179.3,283.8 Z",
  "Київська обл.": "M 281.8,262.6 281.8,259.6 284.4,257.6 287.4,257.6 289.4,255.3 292.3,254.7 295.3,254.7 297.9,252.1 300.9,252.1 303.8,249.5 306.8,249.5 309.1,247.2 311.4,247.5 313.4,245.2 315.7,245.5 318,243.2 320.3,243.6 322.6,241.3 324.9,241.6 327.2,239.3 329.5,239.6 331.8,237.3 334.1,237.6 336.4,235.3 338.8,235.6 341.1,233.3 343.4,233.6 345.7,231.3 348,231.6 350.3,229.3 352.6,229.6 354.9,227.3 357.2,227.6 359.5,225.3 361.8,225.6 364.2,223.3 366.5,223.6 368.8,221.3 371.1,221.6 373.4,219.3 375.7,219.6 378,217.3 380.3,217.6 382.6,215.3 385,215.6 387.3,213.3 389.6,213.6 391.9,211.3 394.2,211.6 396.5,209.3 398.8,209.6 401.1,207.3 403.4,207.6 405.7,205.3 408.1,205.6 410.4,203.3 412.7,203.6 415,201.3 417.3,201.6 419.6,199.3 421.9,199.6 424.2,197.3 426.5,197.6 428.8,195.3 431.1,195.6 433.4,193.3 435.8,193.6 438.1,191.3 440.4,191.6 442.7,189.3 445,189.6 447.3,187.3 449.6,187.6 451.9,185.3 454.2,185.6 456.5,183.3 458.8,183.6 461.1,181.3 463.5,181.6 465.8,179.3 468.1,179.6 470.4,177.3 472.7,177.6 475,175.3 477.3,175.6 479.6,173.3 481.9,173.6 484.2,171.3 486.5,171.6 488.8,169.3 491.2,169.6 493.5,167.3 495.8,167.6 498.1,165.3 500.4,165.6 502.7,163.3 505,163.6 505.3,166.2 505.3,168.8 503,171.1 503,173.8 505.3,176.1 505.3,178.7 503,181 503,183.7 505.3,186 505.3,188.7 503,191 503,193.6 505.3,195.9 505.3,198.6 503,200.9 503,203.5 505.3,205.8 505.3,208.5 503,210.8 503,213.4 505.3,215.7 505.3,218.4 503,220.7 503,223.3 505.3,225.6 505.3,228.3 503,230.6 503,233.2 505.3,235.5 505.3,238.2 503,240.5 503,243.1 505.3,245.4 505.3,248.1 503,250.4 503,253 503.7,255.3 503.7,257.6 501.4,259.6 499.1,259.3 496.8,261.3 494.5,260.9 492.2,262.9 489.8,262.6 487.5,264.6 485.2,264.2 482.9,266.2 480.6,265.8 478.3,267.8 476,267.5 473.7,269.4 471.4,269.1 469.1,271.1 466.8,270.7 464.5,272.7 462.2,272.3 459.8,274.3 457.5,274 455.2,275.9 452.9,275.6 450.6,277.5 448.3,277.2 446,279.1 443.7,278.8 441.4,280.8 439.1,280.4 436.8,282.4 434.5,282.1 432.2,284.1 429.8,283.7 427.5,285.7 425.2,285.4 422.9,287.4 420.6,287 418.3,289 416,288.7 414,286.8 414,284.1 412,281.8 412,279.1 410,276.9 410,274.2 407.6,271.9 405.3,272.3 403,270 400.7,270.3 398.4,268 396.1,268.3 393.8,266 391.5,266.3 389.2,264 386.8,264.3 384.5,262 382.2,262.3 379.9,260 377.6,260.3 375.3,258 373,258.3 370.7,256 368.4,256.3 366.1,254 363.8,254.3 361.5,252 359.2,252.3 356.9,250 354.5,250.3 352.2,248 349.9,248.3 347.6,246 345.3,246.3 343,244 340.7,244.3 338.4,242 336.1,242.3 333.8,240 331.5,240.3 329.2,238 326.8,238.3 324.5,236 322.2,236.3 319.9,234 317.6,234.3 315.3,232 313,232.3 310.7,230 308.4,230.3 306.1,228 303.8,228.3 301.5,226 299.2,226.3 296.9,224 294.6,224.3 292.3,222 289.9,222.3 287.6,220 285.3,220.3 283,218 280.7,218.3 278.4,216 276.1,216.3 273.8,214 271.5,214.3 269.2,212 266.8,212.3 264.5,210 262.2,210.3 259.9,208 257.6,208.3 255.3,206 253,206.3 250.7,204 248.4,204.3 246.1,202 243.8,202.3 241.5,200 239.2,200.3 236.8,198 234.5,198.3 232.2,196 229.9,196.3 227.6,194 225.3,194.3 223,192 220.7,192.3 218.4,190 216.1,190.3 213.8,188 211.5,188.3 209.2,186 206.8,186.3 204.5,184 202.2,184.3 200.1,185.7 198.8,185 195.8,185 191.9,186 189.9,189.9 188.9,193.2 188.6,197.8 189.9,201.1 193.9,202.1 195.5,204.1 198.8,204.1 202,204.7 206,204.4 209,206 212.6,206 214.6,203.7 216.9,203.4 218.2,201.4 221.8,201.4 223.1,200.1 227.1,201.1 229.7,200.1 229.7,196.5 229.4,193.2 228.4,189.9 226.4,184.1 224.5,183.1 225.1,180.5 224.1,178.2 221.5,178.2 219.5,176.2 217.2,176.2 216.6,174.6 212.9,174.9 212.3,178.5 210,181.1 207,181.1 204.7,184.4 200.1,183.1 198.8,185.7 195.8,185 191.9,186 189.9,189.9 193.9,191.3 195.8,193.2 198.8,193.2 202,194.1 204.7,192.8 207,195.1 210,195.1 212.3,197.8 212.9,201.4 216.6,201.8 217.2,199.8 219.5,199.8 221.5,197.8 224.1,197.8 225.1,195.5 224.5,192.8 226.4,191.8 228.4,186 229.4,182.8 229.7,179.5 229.7,175.9 227.1,174.9 223.1,175.9 221.8,174.6 218.2,174.6 216.9,172.6 214.6,172.9 212.6,170.6 209,170.6 206,172.2 202,171.9 198.8,172.6 195.5,172.6 193.9,174.6 189.9,175.6 188.6,178.8 188.9,182.5 189.9,186 200.1,185.7 204.7,184.4 207,181.1 210,181.1 212.3,178.5 212.9,174.9 216.6,174.6 217.2,176.2 219.5,176.2 221.5,178.2 224.1,178.2 225.1,180.5 224.5,183.1 226.4,184.1 228.4,189.9 229.4,193.2 229.7,196.5 229.7,200.1 227.1,201.1 223.1,200.1 221.8,201.4 218.2,201.4 216.9,203.4 214.6,203.7 212.6,206 209,206 206,204.4 202,204.7 198.8,204.1 195.5,204.1 193.9,202.1 189.9,201.1 188.6,197.8 188.9,193.2 189.9,189.9 191.9,186 195.8,185 198.8,185.7 200.1,183.1 204.7,184.4 207,181.1 210,181.1 212.3,178.5 212.9,174.9 216.6,174.6 217.2,176.2 219.5,176.2 221.5,178.2 224.1,178.2 225.1,180.5 224.5,183.1 226.4,184.1 228.4,189.9 229.4,193.2 229.7,196.5 229.7,200.1 227.1,201.1 223.1,200.1 221.8,201.4 218.2,201.4 216.9,203.4 214.6,203.7 212.6,206 209,206 206,204.4 202,204.7 198.8,204.1 195.5,204.1 193.9,202.1 189.9,201.1 188.6,197.8 188.9,193.2 189.9,189.9 191.9,186 195.8,185 198.8,185.7 200.1,183.1 204.7,184.4 207,181.1 210,181.1 212.3,178.5 212.9,174.9 216.6,174.6 217.2,176.2 219.5,176.2 221.5,178.2 224.1,178.2 225.1,180.5 224.5,183.1 226.4,184.1 228.4,189.9 229.4,193.2 229.7,196.5 229.7,200.1 227.1,201.1 223.1,200.1 221.8,201.4 218.2,201.4 216.9,203.4 214.6,203.7 212.6,206 209,206 206,204.4 202,204.7 198.8,204.1 195.5,204.1 193.9,202.1 189.9,201.1 188.6,197.8 188.9,193.2 189.9,189.9 191.9,186 195.8,185 198.8,185.7 200.1,183.1 204.7,184.4 207,181.1 210,181.1 212.3,178.5 212.9,174.9 216.6,174.6 217.2,176.2 219.5,176.2 221.5,178.2 224.1,178.2 225.1,180.5 224.5,183.1 226.4,184.1 228.4,189.9 229.4,193.2 229.7,196.5 229.7,200.1 227.1,201.1 223.1,200.1 221.8,201.4 218.2,201.4 216.9,203.4 214.6,203.7 212.6,206 209,206 206,204.4 202,204.7 198.8,204.1 195.5,204.1 193.9,202.1 189.9,201.1 188.6,197.8 188.9,193.2 189.9,189.9 191.9,186 195.8,185 198.8,185.7 200.1,183.1 204.7,184.4 207,181.1 210,181.1 212.3,178.5 212.9,174.9 216.6,174.6 217.2,176.2 219.5,176.2 221.5,178.2 224.1,178.2 225.1,180.5 224.5,183.1 226.4,184.1 228.4,189.9 229.4,193.2 229.7,196.5 229.7,200.1 227.1,201.1 223.1,200.1 221.8,201.4 218.2,201.4 216.9,203.4 214.6,203.7 212.6,206 209,206 206,204.4 202,204.7 198.8,204.1 195.5,204.1 193.9,202.1 189.9,201.1 188.6,197.8 188.9,193.2 189.9,189.9 191.9,186 195.8,185 198.8,185.7 200.1,183.1 204.7,184.4 207,181.1 210,181.1 212.3,178.5 212.9,174.9 216.6,174.6 217.2,176.2 219.5,176.2 221.5,178.2 224.1,178.2 225.1,180.5 224.5,183.1 226.4,184.1 228.4,189.9 229.4,193.2 229.7,196.5 229.7,200.1 227.1,201.1 223.1,200.1 221.8,201.4 218.2,201.4 216.9,203.4 214.6,203.7 212.6,206 209,206 206,204.4 202,204.7 198.8,204.1 195.5,204.1 193.9,202.1 189.9,201.1 188.6,197.8 188.9,193.2 189.9,189.9 191.9,186 195.8,185 198.8,185.7 200.1,183.1 204.7,184.4 207,181.1 210,181.1 212.3,178.5 212.9,174.9 216.6,174.6 217.2,176.2 219.5,176.2 221.5,178.2 224.1,178.2 22",
};

const DashboardPage = ({ theme }: { theme: 'light' | 'dark' }) => {
    const mfoData = getMfoViolationData();
    const violationTypeData = getViolationTypeData();
    const regionalData = getRegionalData();
    
    const maxCases = Math.max(...regionalData.map(d => d.cases), 0);
    const getColor = (cases: number) => {
        if (cases <= 0) return theme === 'dark' ? '#4b5563' : '#e5e7eb'; // gray for no cases
        // A blue color scale
        const intensity = Math.sqrt(cases / maxCases); // Use sqrt for better distribution
        const r = Math.round(173 * (1 - intensity) + 59 * intensity);
        const g = Math.round(216 * (1 - intensity) + 130 * intensity);
        const b = Math.round(230 * (1 - intensity) + 246 * intensity);
        return `rgb(${r}, ${g}, ${b})`;
    };
    
    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

    const tooltipStyle = {
        backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
        border: '1px solid',
        borderColor: theme === 'dark' ? '#374151' : '#d1d5db',
        color: theme === 'dark' ? '#f3f4f6' : '#111827',
        borderRadius: '0.5rem'
    };

    const axisStrokeColor = theme === 'dark' ? '#9ca3af' : '#6b7280';

    return (
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Панель Моніторингу Порушень</h1>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* MFO Violations Chart */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Рейтинг МФО за кількістю порушень</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={mfoData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                            <XAxis type="number" stroke={axisStrokeColor} />
                            <YAxis type="category" dataKey="name" width={100} stroke={axisStrokeColor} tick={{ fontSize: 12 }} />
                            <Tooltip cursor={{ fill: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }} contentStyle={tooltipStyle} />
                            <Bar dataKey="violations" fill="#3b82f6" barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                {/* Violation Types Chart */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Типи виявлених порушень</h2>
                     <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={violationTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" labelLine={false} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                                {violationTypeData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
            {/* Regional Data Map */}
            <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Статистика порушень за областями</h2>
                <div className="relative w-full aspect-video md:aspect-[2/1] overflow-hidden rounded-md border dark:border-gray-700">
                     <svg viewBox="120 150 420 250" className="w-full h-auto bg-gray-50 dark:bg-gray-900">
                        <g>
                            {regionalData
                                .filter(r => UKRAINE_OBLASTS_PATHS[r.region])
                                .map(({region, cases}) => (
                                <path
                                    key={region}
                                    d={UKRAINE_OBLASTS_PATHS[region]}
                                    fill={getColor(cases)}
                                    stroke={theme === 'dark' ? '#1f2937' : '#ffffff'}
                                    strokeWidth="0.5"
                                    className="transition-opacity duration-200 hover:opacity-80"
                                >
                                    <title>{`${region}: ${cases} випадків`}</title>
                                </path>
                            ))}
                        </g>
                    </svg>
                </div>
            </div>
        </main>
    );
};

const ResourcesPage = () => (
    <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg overflow-hidden">
            <div className="p-8 md:p-12">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Корисні Ресурси</h1>
                <div className="space-y-8 text-gray-700 dark:text-gray-300 prose prose-lg dark:prose-invert max-w-none">
                    <div>
                        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">Офіційні органи</h2>
                        <ul className="list-disc list-inside space-y-2">
                            <li><a href="https://bank.gov.ua/ua/consumer-protection" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Національний банк України - Захист прав споживачів</a></li>
                            <li><a href="https://www.msp.gov.ua/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Міністерство юстиції України</a></li>
                            <li><a href="http://www.reyestr.court.gov.ua/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Єдиний державний реєстр судових рішень</a></li>
                        </ul>
                    </div>
                    <div>
                        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">Законодавство</h2>
                         <ul className="list-disc list-inside space-y-2">
                            <li><a href="https://zakon.rada.gov.ua/laws/show/2455-15#Text" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Закон України "Про споживче кредитування"</a></li>
                            <li><a href="https://zakon.rada.gov.ua/laws/show/222-96-%D0%B2%D1%80#Text" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Закон України "Про захист прав споживачів"</a></li>
                        </ul>
                    </div>
                    <div>
                        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">Громадські організації та юридична допомога</h2>
                         <ul className="list-disc list-inside space-y-2">
                            <li><a href="https://legalaid.gov.ua/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Система безоплатної правової допомоги</a></li>
                            <li>Зверніться до місцевих центрів правової допомоги або юристів, що спеціалізуються на кредитному праві.</li>
                        </ul>
                    </div>
                     <div>
                        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">Важливі поради</h2>
                         <ul className="list-disc list-inside space-y-2">
                            <li><strong>Ніколи не ігноруйте проблему.</strong> Якщо ви не можете сплатити борг, контактуйте з кредитором для реструктуризації.</li>
                            <li><strong>Зберігайте всі документи.</strong> Договори, квитанції, листування - все це може знадобитися в суді.</li>
                            <li><strong>Не бійтеся відстоювати свої права.</strong> Українське законодавство обмежує свавілля МФО.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </main>
);

const App = () => {
    const [currentPage, setCurrentPage] = useState<Page>('home');
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        if (typeof window !== 'undefined' && window.localStorage.getItem('theme')) {
            return window.localStorage.getItem('theme') as 'light' | 'dark';
        }
        if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    });
    
    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            window.localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            window.localStorage.setItem('theme', 'light');
        }
    }, [theme]);
    
    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    };
    
    const renderPage = () => {
        switch (currentPage) {
            case 'home':
                return <HomePage setCurrentPage={setCurrentPage} />;
            case 'analyzer':
                return <AnalyzerPage />;
            case 'dashboard':
                return <DashboardPage theme={theme} />;
            case 'resources':
                return <ResourcesPage />;
            default:
                return <HomePage setCurrentPage={setCurrentPage} />;
        }
    };
    
    return (
        <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300">
            <Header currentPage={currentPage} setCurrentPage={setCurrentPage} theme={theme} toggleTheme={toggleTheme} />
            {renderPage()}
            <Footer />
        </div>
    );
};

export default App;
