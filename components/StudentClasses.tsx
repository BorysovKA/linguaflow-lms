import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Plus, Trash2, Search, Edit } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface UsersListProps {
  users: User[];
  onAddUser: (u: Omit<User, 'id'>) => void;
  onUpdateUser: (id: string, u: Partial<User>) => void;
  onDeleteUser: (id: string) => void;
}

export const UsersList: React.FC<UsersListProps> = ({ users, onAddUser, onUpdateUser, onDeleteUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const { t } = useLanguage();
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    role: 'student' as UserRole,
  });

  const openAddModal = () => {
      setEditingUserId(null);
      setFormData({ username: '', password: '123', name: '', role: 'student' });
      setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
      setEditingUserId(user.id);
      setFormData({ 
        username: user.username, 
        password: user.password || '', 
        name: user.name, 
        role: user.role 
      });
      setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.name || !formData.password) {
      alert("Please fill all fields");
      return;
    }

    if (editingUserId) {
        onUpdateUser(editingUserId, formData);
    } else {
        onAddUser(formData);
    }
    setIsModalOpen(false);
    setFormData({ username: '', password: '', name: '', role: 'student' });
    setEditingUserId(null);
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t.userManagement}</h2>
          <p className="text-slate-500">{t.manageAccess}</p>
        </div>
        <button 
          onClick={openAddModal}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={20} />
          {t.addUser}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
           <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={t.searchUsers}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
            />
           </div>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-medium">
            <tr>
              <th className="px-6 py-3">{t.name}</th>
              <th className="px-6 py-3">{t.username}</th>
              <th className="px-6 py-3">{t.role}</th>
              <th className="px-6 py-3 text-right">{t.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.map(user => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-900">{user.name}</td>
                <td className="px-6 py-4 text-slate-600">
                  {user.username}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                    ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 
                      user.role === 'teacher' ? 'bg-green-100 text-green-800' :
                      user.role === 'methodist' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'
                    }`}>
                    {t.roles[user.role] || user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {user.role !== 'admin' && (
                    <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => openEditModal(user)}
                          className="text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 p-2 rounded-lg transition-colors"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => onDeleteUser(user.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold mb-4">{editingUserId ? t.edit : t.addUser}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t.fullName}</label>
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t.username} (Login)</label>
                  <input 
                    required
                    type="text" 
                    value={formData.username}
                    onChange={e => setFormData({...formData, username: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t.password}</label>
                  <input 
                    required
                    type="text" 
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t.role}</label>
                <select 
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                >
                  <option value="student">{t.roles.student}</option>
                  <option value="teacher">{t.roles.teacher}</option>
                  <option value="methodist">{t.roles.methodist}</option>
                  <option value="admin">{t.roles.admin}</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  {t.cancel}
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  {editingUserId ? t.saveChanges : t.createUser}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};