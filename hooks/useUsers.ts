import { useState, useEffect } from 'react';
import { User } from '../types';
import { dataService } from '../services/dataService';

export const useUsers = (
  initialUsers: User[], 
  isLoading: boolean,
  currentUser: User | null,
  updateCurrentUser: (u: User) => void
) => {
  const [users, setUsers] = useState<User[]>(initialUsers);

  useEffect(() => {
    if (!isLoading) {
      dataService.saveUsers(users);
    }
  }, [users, isLoading]);

  const addUser = (newUser: Omit<User, 'id'>) => {
    const u: User = { ...newUser, id: Date.now().toString() };
    setUsers(prev => [...prev, u]);
  };

  const updateUser = (id: string, updatedData: Partial<User>) => {
    const updatedUsers = users.map(u => u.id === id ? { ...u, ...updatedData } : u);
    setUsers(updatedUsers);
    
    // If the logged-in user updated their own profile, sync the session state
    if (currentUser && currentUser.id === id) {
        const updatedCurrent = { ...currentUser, ...updatedData };
        updateCurrentUser(updatedCurrent);
    }
  };

  const deleteUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  return {
    users,
    setUsers,
    addUser,
    updateUser,
    deleteUser
  };
};