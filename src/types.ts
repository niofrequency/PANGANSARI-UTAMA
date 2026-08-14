export type UserRole =
  | 'HOUSEKEEPER'
  | 'HOUSEKEEPING_SUPERVISOR'
  | 'HOUSEKEEPING_MANAGER'
  | 'FOOD_SAFETY_TECHNICIAN'
  | 'FOOD_SAFETY_SUPERVISOR'
  | 'FOOD_SAFETY_MANAGER'
  | 'ADMIN';

export interface User {
  id: string;
  name: string; // derived display name — always firstName + ' ' + lastName
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  site: string;
  isActive: boolean;
}

export interface Site {
  id: string;
  name: string;
  location: string;
}

export type SubmissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WARNING';

export interface Submission {
  id: string;
  userId: string;
  userName: string;
  role: UserRole;
  siteId: string;
  siteName: string;
  timestamp: string;
  type: 'HOUSEKEEPING' | 'FOOD_SAFETY';
  status: SubmissionStatus;
  items: {
    id: string;
    question: string;
    answer: string | boolean | number;
    photoUrl?: string;
  }[];
  notes?: string;
  rejectionReason?: string;
  score?: number;
}

export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  type: 'VIDEO' | 'PDF' | 'SLIDES';
  completedBy: string[]; // User IDs
}

export interface Warning {
  id: string;
  technicianId: string;
  technicianName: string;
  supervisorId: string;
  reason: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  timestamp: string;
}
