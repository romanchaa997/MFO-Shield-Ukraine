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
    { region: 'Вінницька обл.', cases: 25 },
    { region: 'Волинська обл.', cases: 18 },
    { region: 'Дніпропетровська обл.', cases: 42 },
    { region: 'Донецька обл.', cases: 38 },
    { region: 'Житомирська обл.', cases: 22 },
    { region: 'Закарпатська обл.', cases: 15 },
    { region: 'Запорізька обл.', cases: 30 },
    { region: 'Івано-Франківська обл.', cases: 28 },
    { region: 'Київська обл.', cases: 58 },
    { region: 'Кіровоградська обл.', cases: 19 },
    { region: 'Луганська обл.', cases: 20 },
    { region: 'Львівська обл.', cases: 31 },
    { region: 'Миколаївська обл.', cases: 26 },
    { region: 'Одеська обл.', cases: 35 },
    { region: 'Полтавська обл.', cases: 24 },
    { region: 'Рівненська обл.', cases: 17 },
    { region: 'Сумська обл.', cases: 16 },
    { region: 'Тернопільська обл.', cases: 14 },
    { region: 'Харківська обл.', cases: 29 },
    { region: 'Херсонська обл.', cases: 23 },
    { region: 'Хмельницька обл.', cases: 21 },
    { region: 'Черкаська обл.', cases: 20 },
    { region: 'Чернівецька обл.', cases: 12 },
    { region: 'Чернігівська обл.', cases: 13 },
    { region: 'м. Київ', cases: 75 },
  ];
};
