// Simple authentication system
export interface User {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'user';
  name: string;
}

// Hardcoded users for simplicity
const USERS: User[] = [
  {
    id: 'admin-1',
    username: 'admin',
    password: 'adminsayshello',
    role: 'admin',
    name: 'Administrator'
  },
  {
    id: 'user-1', 
    username: 'user1',
    password: 'userhello1',
    role: 'user',
    name: 'User One'
  },
  {
    id: 'user-2',
    username: 'user2', 
    password: 'userhello2',
    role: 'user',
    name: 'User Two'
  }
];

export function authenticateUser(username: string, password: string): User | null {
  const user = USERS.find(u => u.username === username && u.password === password);
  return user || null;
}

export function getUserById(id: string): User | null {
  return USERS.find(u => u.id === id) || null;
}

export function getAllUsers(): User[] {
  return USERS.filter(u => u.role === 'user');
}

// Session management using localStorage (client-side only for simplicity)
export function setCurrentUser(user: User): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('currentUser', JSON.stringify(user));
  }
}

export function getCurrentUser(): User | null {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('currentUser');
    return stored ? JSON.parse(stored) : null;
  }
  return null;
}

export function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('currentUser');
  }
}

export function isAdmin(user: User | null): boolean {
  return user?.role === 'admin';
}

export function isUser(user: User | null): boolean {
  return user?.role === 'user';
}
