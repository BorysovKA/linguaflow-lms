import { useState } from 'react';
import { User } from '../types';
import { dataService } from '../services/dataService';

export const useAuth = (initialUser: User | null) => {
  const [currentUser, setCurrentUser] = useState<User | null>(initialUser);

  const login = (user: User) => {
    setCurrentUser(user);
    dataService.persistCurrentUser(user);
  };

  const logout = () => {
    setCurrentUser(null);
    dataService.persistCurrentUser(null);
  };

  const updateCurrentUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    dataService.persistCurrentUser(updatedUser);
  };

  return {
    currentUser,
    setCurrentUser, // Exposed for initialization
    login,
    logout,
    updateCurrentUser
  };
};