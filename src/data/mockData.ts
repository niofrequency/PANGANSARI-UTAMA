import { User, Site, Submission, TrainingModule, Warning } from '../types';

export const SITES: Site[] = [
  { id: 'site-1', name: 'PSU Head Office', location: 'Jakarta' },
  { id: 'site-2', name: 'Catering Facility A', location: 'Surabaya' },
];

export const INITIAL_USERS: User[] = [
  { id: 'u1', name: 'Admin User', email: 'mpigome44@gmail.com', role: 'ADMIN', site: 'site-1', isActive: true },
  { id: 'u2', name: 'John House', email: 'house@psu.com', role: 'HOUSEKEEPER', site: 'site-2', isActive: true },
  { id: 'u3', name: 'Sarah Super', email: 'super@psu.com', role: 'HOUSEKEEPING_SUPERVISOR', site: 'site-2', isActive: true },
  { id: 'u4', name: 'Mike Manager', email: 'manager@psu.com', role: 'HOUSEKEEPING_MANAGER', site: 'site-1', isActive: true },
  { id: 'u5', name: 'Chef Bob', email: 'bob@psu.com', role: 'FOOD_SAFETY_TECHNICIAN', site: 'site-2', isActive: true },
  { id: 'u6', name: 'Alice Safety', email: 'alice@psu.com', role: 'FOOD_SAFETY_SUPERVISOR', site: 'site-2', isActive: true },
  { id: 'u7', name: 'David FS', email: 'david@psu.com', role: 'FOOD_SAFETY_MANAGER', site: 'site-1', isActive: true },
];

export const TRAINING_MODULES: TrainingModule[] = [
  { id: 't1', title: 'Cross-Contamination Basics', description: 'Learn how to prevent cross-contamination in the kitchen.', type: 'VIDEO', completedBy: ['u5'] },
  { id: 't2', title: 'Cleaning Protocols', description: 'Standard operating procedures for deep cleaning.', type: 'PDF', completedBy: [] },
];

// Helper to generate some history
const generateHistory = (): Submission[] => {
  const history: Submission[] = [];
  const roles: ('HOUSEKEEPING' | 'FOOD_SAFETY')[] = ['HOUSEKEEPING', 'FOOD_SAFETY'];
  const statuses: Submission['status'][] = ['APPROVED', 'APPROVED', 'APPROVED', 'REJECTED', 'PENDING'];

  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    history.push({
      id: `s-${i}`,
      userId: i % 2 === 0 ? 'u2' : 'u5',
      userName: i % 2 === 0 ? 'John House' : 'Chef Bob',
      role: i % 2 === 0 ? 'HOUSEKEEPER' : 'FOOD_SAFETY_TECHNICIAN',
      siteId: 'site-2',
      siteName: 'Catering Facility A',
      timestamp: date.toISOString(),
      type: i % 2 === 0 ? 'HOUSEKEEPING' : 'FOOD_SAFETY',
      status: statuses[Math.floor(Math.random() * statuses.length)],
      score: Math.floor(Math.random() * 40) + 60,
      items: [
        { id: '1', question: 'Area Cleaned', answer: true },
        { id: '2', question: 'PPE Worn', answer: true },
      ]
    });
  }
  return history;
};

export const INITIAL_SUBMISSIONS = generateHistory();
