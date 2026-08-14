import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { AnalyticsDashboard } from '../Dashboard/AnalyticsDashboard';
import { 
  Users, UserPlus, Settings, Shield, Edit2, 
  Trash2, CheckCircle2, XCircle, Search, Mail, Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../utils/cn';
import { UserRole } from '../../types';
import { useTranslation } from '../../i18n/LanguageContext';
import { SUPER_ADMIN_EMAIL } from '../../services/authService';
import { isFirebaseConfigured } from '../../lib/firebase';

export function AdminPortal({ store }: { store: ReturnType<typeof useAppStore> }) {
  const { t } = useTranslation();
  const { users, sites, submissions, warnings, addUser, updateUserRole, toggleUserActive } = store;
  const [activeTab, setActiveTab] = useState<'USERS' | 'ANALYTICS'>('USERS');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'HOUSEKEEPER' as UserRole, site: 'site-1' });

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    addUser(newUser);
    setShowAddModal(false);
    setNewUser({ name: '', email: '', role: 'HOUSEKEEPER', site: 'site-1' });
  };

  return (
    <div className="space-y-6">
      <div className="flex bg-white rounded-2xl p-1.5 shadow-sm border border-psu-gray/5">
        {[
          { id: 'USERS', icon: Users, label: t('admin.tabPersonnel') },
          { id: 'ANALYTICS', icon: Shield, label: t('admin.tabAnalytics') },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === tab.id 
                ? "bg-psu-gray text-white shadow-md shadow-psu-gray/20" 
                : "text-psu-gray/40 hover:text-psu-gray"
            )}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'USERS' && (
          <motion.div
            key="users"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-psu-gray/20" size={18} />
                <input 
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('admin.searchPlaceholder')}
                  className="w-full pl-12 pr-4 py-4 bg-white border border-psu-gray/5 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-psu-gray/5 shadow-sm"
                />
              </div>
              <button 
                onClick={() => setShowAddModal(true)}
                className="bg-psu-green text-white w-14 h-14 flex items-center justify-center rounded-2xl shadow-xl shadow-psu-green/20 active:scale-95 transition-all"
              >
                <UserPlus size={22} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map(user => (
                <div key={user.id} className={cn("card flex items-center justify-between group", !user.isActive && "opacity-30 grayscale")}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-psu-bg rounded-2xl flex items-center justify-center text-psu-gray/20">
                      <Users size={22} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-psu-gray">{user.name}</h4>
                      <p className="text-[10px] text-psu-gray/40 font-black uppercase tracking-widest mt-0.5">{t(`roles.${user.role}`)} • {user.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <select 
                      value={user.role}
                      disabled={user.email.toLowerCase() === SUPER_ADMIN_EMAIL}
                      onChange={(e) => updateUserRole(user.id, e.target.value as UserRole)}
                      className="text-[9px] bg-psu-bg border border-psu-gray/10 rounded-md px-2 py-1 font-black uppercase tracking-tighter outline-none focus:ring-2 focus:ring-psu-blue/20 disabled:opacity-50"
                    >
                      <option value="HOUSEKEEPER">{t('roles.HOUSEKEEPER')}</option>
                      <option value="HOUSEKEEPING_SUPERVISOR">{t('roles.HOUSEKEEPING_SUPERVISOR')}</option>
                      <option value="HOUSEKEEPING_MANAGER">{t('roles.HOUSEKEEPING_MANAGER')}</option>
                      <option value="FOOD_SAFETY_TECHNICIAN">{t('roles.FOOD_SAFETY_TECHNICIAN')}</option>
                      <option value="FOOD_SAFETY_SUPERVISOR">{t('roles.FOOD_SAFETY_SUPERVISOR')}</option>
                      <option value="FOOD_SAFETY_MANAGER">{t('roles.FOOD_SAFETY_MANAGER')}</option>
                      {/* ADMIN intentionally omitted: that role is locked to one
                          account and can't be granted from this screen. */}
                    </select>
                    <button 
                      onClick={() => toggleUserActive(user.id)}
                      className={cn(
                        "p-2 rounded-xl transition-all",
                        user.isActive ? "text-psu-rejected bg-psu-rejected/5 hover:bg-psu-rejected/10" : "text-psu-green bg-psu-green/5 hover:bg-psu-green/10"
                      )}
                    >
                      {user.isActive ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'ANALYTICS' && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <h2 className="text-xl font-bold tracking-tight text-psu-gray mb-6 px-2">{t('admin.tabAnalytics')}</h2>
            <AnalyticsDashboard submissions={submissions} warnings={warnings} sites={sites} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add User Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-psu-gray/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-[32px] p-10 shadow-2xl"
            >
              <div className="flex flex-col items-center mb-10">
                <div className="w-16 h-16 bg-psu-green/10 rounded-2xl flex items-center justify-center text-psu-green mb-4">
                  <UserPlus size={32} />
                </div>
                <h3 className="text-xl font-bold tracking-tight text-psu-gray">{t('admin.addUserTitle')}</h3>
                <p className="text-[10px] text-psu-gray/40 font-black uppercase tracking-widest mt-2">{t('admin.addUserSubtitle')}</p>
              </div>

              {isFirebaseConfigured && (
                <p className="text-[11px] text-psu-blue/70 bg-psu-blue/5 rounded-xl p-3 mb-5 leading-snug">{t('admin.inviteHint')}</p>
              )}
              
              <form onSubmit={handleAddUser} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-psu-gray/40 uppercase mb-2 tracking-widest">{t('admin.nameLabel')}</label>
                  <input 
                    required
                    type="text" 
                    value={newUser.name}
                    onChange={(e) => setNewUser(p => ({ ...p, name: e.target.value }))}
                    className="w-full p-4 bg-psu-bg border border-psu-gray/10 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-psu-green/20 transition-all"
                    placeholder={t('admin.namePlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-psu-gray/40 uppercase mb-2 tracking-widest">{t('admin.emailLabel')}</label>
                  <input 
                    required
                    type="email" 
                    value={newUser.email}
                    onChange={(e) => setNewUser(p => ({ ...p, email: e.target.value }))}
                    className="w-full p-4 bg-psu-bg border border-psu-gray/10 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-psu-green/20 transition-all"
                    placeholder={t('admin.emailPlaceholder')}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-psu-gray/40 uppercase mb-2 tracking-widest">{t('admin.roleLabel')}</label>
                    <select 
                      value={newUser.role}
                      onChange={(e) => setNewUser(p => ({ ...p, role: e.target.value as any }))}
                      className="w-full p-4 bg-psu-bg border border-psu-gray/10 rounded-2xl text-[10px] font-black uppercase tracking-tighter"
                    >
                      <option value="HOUSEKEEPER">{t('roles.HOUSEKEEPER')}</option>
                      <option value="HOUSEKEEPING_SUPERVISOR">{t('roles.HOUSEKEEPING_SUPERVISOR')}</option>
                      <option value="HOUSEKEEPING_MANAGER">{t('roles.HOUSEKEEPING_MANAGER')}</option>
                      <option value="FOOD_SAFETY_TECHNICIAN">{t('roles.FOOD_SAFETY_TECHNICIAN')}</option>
                      <option value="FOOD_SAFETY_SUPERVISOR">{t('roles.FOOD_SAFETY_SUPERVISOR')}</option>
                      <option value="FOOD_SAFETY_MANAGER">{t('roles.FOOD_SAFETY_MANAGER')}</option>
                      {/* ADMIN not offered here — locked to one account */}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-psu-gray/40 uppercase mb-2 tracking-widest">{t('admin.siteLabel')}</label>
                    <select 
                      value={newUser.site}
                      onChange={(e) => setNewUser(p => ({ ...p, site: e.target.value }))}
                      className="w-full p-4 bg-psu-bg border border-psu-gray/10 rounded-2xl text-[10px] font-black uppercase tracking-tighter"
                    >
                      {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 text-psu-gray/40 font-black text-[10px] uppercase tracking-widest">{t('common.cancel')}</button>
                  <button 
                    type="submit"
                    className="flex-[2] py-4 bg-psu-green text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-psu-green/20 active:scale-95 transition-all"
                  >
                    {t('admin.addButton')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
