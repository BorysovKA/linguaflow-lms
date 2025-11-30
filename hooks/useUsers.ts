
import { useState, useEffect } from 'react';
import { User, Group, ActionType, TargetType } from '../types';
import { dataService } from '../services/dataService';
import { MOCK_GROUPS } from '../services/mockData';

export const useUsers = (
  initialUsers: User[], 
  isLoading: boolean,
  currentUser: User | null,
  updateCurrentUser: (u: User) => void
) => {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    if (!isLoading) {
      dataService.saveUsers(users);
      // In a real app, save groups too
    }
  }, [users, isLoading]);

  // Load groups initially (simulation)
  useEffect(() => {
      setGroups(MOCK_GROUPS);
  }, []);

  const addUser = (newUser: Omit<User, 'id'>) => {
    const u: User = { ...newUser, id: Date.now().toString(), allowedContent: [], groups: [] };
    setUsers(prev => [...prev, u]);
  };

  const updateUser = (id: string, updatedData: Partial<User>) => {
    const updatedUsers = users.map(u => u.id === id ? { ...u, ...updatedData } : u);
    setUsers(updatedUsers);
    
    if (currentUser && currentUser.id === id) {
        const updatedCurrent = { ...currentUser, ...updatedData };
        updateCurrentUser(updatedCurrent);
    }
  };

  const updateUserAccess = (userId: string, allowedContent: string[]) => {
      updateUser(userId, { allowedContent });
  };
  
  const denyUserAccess = (userId: string, contentId: string) => {
      const user = users.find(u => u.id === userId);
      if (!user) return;
      
      const currentDenied = user.deniedContent || [];
      if (!currentDenied.includes(contentId)) {
          updateUser(userId, { deniedContent: [...currentDenied, contentId] });
      }
  };

  const deleteUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  // --- Group Management ---

  const createGroup = (name: string) => {
      const newGroup: Group = {
          id: Date.now().toString(),
          name,
          studentIds: [],
          allowedContent: []
      };
      setGroups(prev => [...prev, newGroup]);
  };

  const deleteGroup = (groupId: string) => {
      setGroups(prev => prev.filter(g => g.id !== groupId));
  };

  const updateGroupAccess = (groupId: string, allowedContent: string[]) => {
      setGroups(prev => prev.map(g => g.id === groupId ? { ...g, allowedContent } : g));
  };

  const updateGroupMembers = (groupId: string, studentIds: string[]) => {
      setGroups(prev => prev.map(g => g.id === groupId ? { ...g, studentIds } : g));
      
      // Update users' group list as well (Optional but good for bi-directional consistency)
      // This part is a bit complex for a simple mock state, simplified logic:
      setUsers(prevUsers => prevUsers.map(u => {
           // If user is now in studentIds, ensure groupId is in u.groups
           // If user is NOT in studentIds, ensure groupId is removed from u.groups
           const userGroups = u.groups || [];
           if (studentIds.includes(u.id)) {
               if (!userGroups.includes(groupId)) return { ...u, groups: [...userGroups, groupId] };
           } else {
               if (userGroups.includes(groupId)) return { ...u, groups: userGroups.filter(gid => gid !== groupId) };
           }
           return u;
      }));
  };

  return {
    users,
    groups,
    setUsers,
    addUser,
    updateUser,
    deleteUser,
    updateUserAccess,
    denyUserAccess,
    createGroup,
    deleteGroup,
    updateGroupAccess,
    updateGroupMembers
  };
};