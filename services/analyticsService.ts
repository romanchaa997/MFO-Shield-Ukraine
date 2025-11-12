import { MfoViolationData, ViolationTypeData, RegionalData } from '../types';

// Mock data for demonstration purposes. In a real application, this would come from an API.

export const getMfoViolationData = (): MfoViolationData[] => {
  return [
    { name: 'ШвидкоГроші', violations: 45 },
    { name: 'MyCredit', violations: 32 },
    { name: 'Moneyveo', violations: 28 },
    { name: 'CreditPlus', violations: 21 },
    { name: 'CCLoan', violations: 15 },
    { name: 'Інші', violations: 50 },
  ];
};

export const getViolationTypeData = (): ViolationTypeData[] => {
  return [
    { name: 'Перевищення денної ставки', value: 120 },
    { name: 'Перевищення загальної суми', value: 95 },
    { name: 'Приховані комісії', value: 45 },
    { name: 'Інше', value: 25 },
  ];
};

export const getRegionalData = (): RegionalData[] => {
  return [
    { region: 'Київська обл.', cases: 58 },
    { region: 'Дніпропетровська обл.', cases: 42 },
    { region: 'Одеська обл.', cases: 35 },
    { region: 'Львівська обл.', cases: 31 },
    { region: 'Харківська обл.', cases: 29 },
    { region: 'Інші області', cases: 80 },
  ];
};
