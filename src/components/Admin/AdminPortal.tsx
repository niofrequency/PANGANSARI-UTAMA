import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { AnalyticsDashboard } from '../Dashboard/AnalyticsDashboard';
import {
  Users, UserPlus, Shield, Trash2, XCircle, Search, Activity as ActivityIcon,
  User as UserIcon, AlertTriangle, Copy, Check, Eye, EyeOff, RefreshCw, KeyRound
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../utils/cn';
import { UserRole, Submission, User } from '../../types';
import { useTranslation } from '../../i18n/LanguageContext';
import { SUPER_ADMIN_EMAIL } from '../../services/authService';
import { isFirebaseConfigured } from '../../lib/firebase';

// Avoids visually-ambiguous characters (0/O, 1/l/I) since this password  
// gets read aloud, typed by hand, or copy-pasted into a text message.
function generatePassword(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let pw = '';
  for (let i = 0; i < length; i++) {
    pw += chars[Math.floor(Math.random() * chars.length)];
  }
  return pw;
}

export function AdminPortal({ store }: { store: ReturnType<typeof useAppStore> }) {
  const { t } = useTranslation();
  const { users, sites, submissions, warnings, addUser, updateUserRole, updateUserSite, resetUserCredentials, deleteUser } = store;
  const [activeTab, setActiveTab] = useState<'USERS' | 'ACTIVITY' | 'ANALYTICS'>('USERS');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ firstName: '', lastName: '', email: '', role: 'HOUSEKEEPER' as UserRole, site: 'site-1' });
  const [password, setPassword] = useState(() => generatePassword());
  const [showPassword, setShowPassword] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [addUserError, setAddUserError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [justCreated, setJustCreated] = useState<{ name: string; email: string; password: string } | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  // Reset Login modal — lets the admin type a new email and/or password
  // for someone else's existing account (see adminResetCredentials.ts /
  // the Cloud Function of the same name for why this needs a server call).
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [resetEmail, setResetEmail] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // Activity tab state
  const [activitySegment, setActivitySegment] = useState<'SUBMISSIONS' | 'WARNINGS'>('SUBMISSIONS');
  const [activitySearch, setActivitySearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | Submission['status']>('ALL');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  // All submissions, across every user and every site — this is the whole
  // point of the Admin Portal's Activity tab: nothing here is scoped to
  // "my site" the way the Supervisor/Manager portals are.
  const filteredSubmissions = submissions
    .filter(s => statusFilter === 'ALL' || s.status === statusFilter)
    .filter(s => s.userName.toLowerCase().includes(activitySearch.toLowerCase()))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const filteredWarnings = warnings
    .filter(w => w.technicianName.toLowerCase().includes(activitySearch.toLowerCase()))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddUserError('');
    if (!newUser.firstName.trim()) {
      setAddUserError(t('auth.errorNameRequired'));
      return;
    }
    const name = `${newUser.firstName} ${newUser.lastName}`.trim();

    if (isFirebaseConfigured && password.length < 6) {
      setAddUserError(t('admin.passwordTooShort'));
      return;
    }

    setIsCreatingUser(true);
    const result = await addUser({ ...newUser, name }, password);
    setIsCreatingUser(false);

    if (!result.ok) {
      setAddUserError(
        result.error === 'already-exists' ? t('admin.emailAlreadyExists') : t('admin.createAccountFailed')
      );
      return;
    }

    if (isFirebaseConfigured) {
      // createStaffAccountDirect either fully succeeds (real Auth account +
      // profile, password works right now) or returns ok: false above —
      // there's no more silent partial state to account for here.
      setJustCreated({ name, email: newUser.email, password });
    } else {
      setShowAddModal(false);
    }
    setNewUser({ firstName: '', lastName: '', email: '', role: 'HOUSEKEEPER', site: 'site-1' });
    setPassword(generatePassword());
  };

  const openResetModal = (user: User) => {
    setResetTarget(user);
    setResetEmail(user.email);
    setResetPassword(generatePassword());
    setShowResetPassword(false);
    setResetError('');
    setResetSuccess(false);
  };

  const closeResetModal = () => {
    setResetTarget(null);
  };

  const handleResetCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setResetError('');

    const newEmail = resetEmail.trim().toLowerCase();
    const emailChanged = newEmail !== resetTarget.email.toLowerCase();
    const passwordChanged = resetPassword.length > 0;

    if (!emailChanged && !passwordChanged) {
      setResetError(t('admin.resetNothingToChange'));
      return;
    }
    if (passwordChanged && resetPassword.length < 6) {
      setResetError(t('admin.passwordTooShort'));
      return;
    }

    setIsResetting(true);
    const result = await resetUserCredentials(resetTarget.id, {
      newEmail: emailChanged ? newEmail : undefined,
      newPassword: passwordChanged ? resetPassword : undefined,
    });
    setIsResetting(false);

    if (!result.ok) {
      setResetError(
        result.error === 'already-exists' ? t('admin.emailAlreadyExists') : t('admin.createAccountFailed')
      );
      return;
    }
    setResetSuccess(true);
  };

  const credentialsMessage = justCreated
    ? t('admin.credentialsMessage', { url: window.location.origin, email: justCreated.email, password: justCreated.password })
    : '';

  const copyInviteMessage = async () => {
    try {
      await navigator.clipboard.writeText(credentialsMessage);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    } catch {
      // Clipboard API can fail (permissions, non-secure context, etc.) —
      // the message is still shown on screen and selectable by hand.
    }
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setJustCreated(null);
    setInviteCopied(false);
    setAddUserError('');
  };

  const statusBadgeClass = (status: Submission['status']) => cn(
    "text-[9px] font-black uppercase tracking-tighter px-2 py-1 rounded-md shrink-0",
    status === 'APPROVED' ? "bg-psu-green/10 text-psu-green" :
    status === 'REJECTED' ? "bg-psu-rejected/10 text-psu-rejected" :
    "bg-psu-blue/10 text-psu-blue"
  );

  const statusLabel = (status: Submission['status']) =>
    status === 'APPROVED' ? t('common.approved') : status === 'REJECTED' ? t('common.rejected') : t('common.pending');

  return (
    <div className="space-y-6">
      <div className="flex bg-white rounded-2xl p-1.5 shadow-sm border border-psu-gray/5">
        {[
          { id: 'USERS', icon: Users, label: t('admin.tabPersonnel') },
          { id: 'ACTIVITY', icon: ActivityIcon, label: t('admin.tabActivity') },
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
                onClick={() => { setJustCreated(null); setAddUserError(''); setPassword(generatePassword()); setShowAddModal(true); }}
                className="bg-psu-green text-white w-14 h-14 flex items-center justify-center rounded-2xl shadow-xl shadow-psu-green/20 active:scale-95 transition-all"
              >
                <UserPlus size={22} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map(user => (
                <div key={user.id} className="card flex flex-col gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 bg-psu-bg rounded-2xl flex items-center justify-center text-psu-gray/20 shrink-0">
                      <Users size={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-psu-gray truncate">{user.name}</h4>
                      <p className="text-[10px] text-psu-gray/40 font-black uppercase tracking-widest mt-0.5 truncate">{t(`roles.${user.role}`)} • {user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={user.role}
                      disabled={user.email.toLowerCase() === SUPER_ADMIN_EMAIL}
                      onChange={(e) => updateUserRole(user.id, e.target.value as UserRole)}
                      className="flex-1 min-w-0 text-[9px] bg-psu-bg border border-psu-gray/10 rounded-md px-2 py-1.5 font-black uppercase tracking-tighter outline-none focus:ring-2 focus:ring-psu-blue/20 disabled:opacity-50 truncate"
                    >
                      <option value="HOUSEKEEPER">{t('rolesShort.HOUSEKEEPER')}</option>
                      <option value="HOUSEKEEPING_SUPERVISOR">{t('rolesShort.HOUSEKEEPING_SUPERVISOR')}</option>
                      <option value="HOUSEKEEPING_MANAGER">{t('rolesShort.HOUSEKEEPING_MANAGER')}</option>
                      <option value="FOOD_SAFETY_TECHNICIAN">{t('rolesShort.FOOD_SAFETY_TECHNICIAN')}</option>
                      <option value="FOOD_SAFETY_SUPERVISOR">{t('rolesShort.FOOD_SAFETY_SUPERVISOR')}</option>
                      <option value="FOOD_SAFETY_MANAGER">{t('rolesShort.FOOD_SAFETY_MANAGER')}</option>
                      <option value="GENERAL_MANAGER">{t('rolesShort.GENERAL_MANAGER')}</option>
                      {/* ADMIN intentionally omitted: that role is locked to one
                          account and can't be granted from this screen. */}
                    </select>
                    {user.email.toLowerCase() !== SUPER_ADMIN_EMAIL && isFirebaseConfigured && (
                      <button
                        onClick={() => openResetModal(user)}
                        className="p-2 rounded-xl transition-all shrink-0 text-psu-blue bg-psu-blue/5 hover:bg-psu-blue/10"
                        aria-label={t('admin.resetLoginButton')}
                      >
                        <KeyRound size={18} />
                      </button>
                    )}
                    {user.email.toLowerCase() !== SUPER_ADMIN_EMAIL && (
                      <button
                        onClick={() => { setDeleteTarget(user); setDeleteConfirmText(''); }}
                        className="p-2 rounded-xl transition-all shrink-0 text-psu-rejected bg-psu-rejected/5 hover:bg-psu-rejected/10"
                        aria-label={t('admin.deleteButton')}
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>

                  {user.email.toLowerCase() !== SUPER_ADMIN_EMAIL && (
                    <select
                      value={user.site}
                      onChange={(e) => updateUserSite(user.id, e.target.value)}
                      className="w-full text-[9px] bg-psu-bg border border-psu-gray/10 rounded-md px-2 py-1.5 font-black uppercase tracking-tighter outline-none focus:ring-2 focus:ring-psu-blue/20 truncate"
                    >
                      {sites.map(site => (
                        <option key={site.id} value={site.id}>{site.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'ACTIVITY' && (
          <motion.div
            key="activity"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div className="flex bg-white rounded-2xl p-1.5 shadow-sm border border-psu-gray/5 max-w-xs">
              {[
                { id: 'SUBMISSIONS', label: t('admin.segmentSubmissions') },
                { id: 'WARNINGS', label: t('admin.segmentWarnings') },
              ].map(seg => (
                <button
                  key={seg.id}
                  onClick={() => setActivitySegment(seg.id as any)}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    activitySegment === seg.id ? "bg-psu-blue text-white shadow-sm" : "text-psu-gray/40"
                  )}
                >
                  {seg.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-psu-gray/20" size={18} />
              <input 
                type="text"
                value={activitySearch}
                onChange={(e) => setActivitySearch(e.target.value)}
                placeholder={t('admin.searchActivityPlaceholder')}
                className="w-full pl-12 pr-4 py-4 bg-white border border-psu-gray/5 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-psu-gray/5 shadow-sm"
              />
            </div>

            {activitySegment === 'SUBMISSIONS' && (
              <>
                <div className="flex gap-2 flex-wrap">
                  {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                        statusFilter === status ? "bg-psu-gray text-white" : "bg-white text-psu-gray/40 border border-psu-gray/10"
                      )}
                    >
                      {status === 'ALL' ? t('admin.filterAll') : statusLabel(status)}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSubmissions.map(s => (
                    <div
                      key={s.id}
                      onClick={() => setSelectedSubmission(s)}
                      className="card flex items-center justify-between cursor-pointer group hover:border-psu-blue/20 transition-all"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 bg-psu-bg rounded-2xl flex items-center justify-center text-psu-gray/20 shrink-0">
                          <UserIcon size={22} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-psu-gray truncate">{s.userName}</h4>
                          <p className="text-[10px] text-psu-gray/40 font-black uppercase tracking-widest mt-0.5 truncate">
                            {s.siteName} • {new Date(s.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <span className={statusBadgeClass(s.status)}>{statusLabel(s.status)}</span>
                    </div>
                  ))}
                  {filteredSubmissions.length === 0 && (
                    <div className="col-span-full text-center py-16 opacity-30">
                      <ActivityIcon size={48} className="mx-auto mb-2" />
                      <p className="text-xs font-black uppercase tracking-widest">{t('admin.noActivity')}</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {activitySegment === 'WARNINGS' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredWarnings.map(w => (
                  <div key={w.id} className="card flex items-start gap-4">
                    <div className="w-12 h-12 bg-psu-warning/10 rounded-2xl flex items-center justify-center text-psu-warning shrink-0">
                      <AlertTriangle size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-psu-gray truncate">{w.technicianName}</h4>
                      <p className="text-[11px] text-psu-gray/60 font-medium mt-1">{w.reason}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded bg-psu-warning/10 text-psu-warning">
                          {t(`supervisorHK.severity${w.severity.charAt(0)}${w.severity.slice(1).toLowerCase()}`)}
                        </span>
                        <span className="text-[9px] text-psu-gray/30 font-bold uppercase tracking-widest">
                          {new Date(w.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredWarnings.length === 0 && (
                  <div className="col-span-full text-center py-16 opacity-30">
                    <AlertTriangle size={48} className="mx-auto mb-2" />
                    <p className="text-xs font-black uppercase tracking-widest">{t('admin.noActivity')}</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'ANALYTICS' && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <h2 className="text-xl font-bold tracking-tight text-psu-gray mb-6 px-2">{t('admin.tabAnalytics')}</h2>
            <AnalyticsDashboard submissions={submissions} warnings={warnings} sites={sites} users={users} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submission Detail Modal (read-only — Admin can see everything but
          approving/rejecting stays with Supervisors/Managers) */}
      <AnimatePresence>
        {selectedSubmission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-psu-gray/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="p-8 overflow-y-auto">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight text-psu-gray">{t('admin.detailTitle')}</h3>
                    <p className="text-[10px] text-psu-gray/40 font-black uppercase tracking-widest mt-1">{t('supervisorHK.entryId')}{selectedSubmission.id.slice(-6)}</p>
                  </div>
                  <button onClick={() => setSelectedSubmission(null)} className="p-2 text-psu-gray/30 hover:text-psu-rejected transition-colors">
                    <XCircle size={24} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="bg-psu-bg p-5 rounded-2xl border border-psu-gray/5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                        <UserIcon className="text-psu-blue" size={24} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-black text-psu-gray/40 uppercase tracking-widest">{t('admin.submittedBy')}</p>
                        <p className="text-sm font-bold text-psu-gray truncate">{selectedSubmission.userName}</p>
                        <p className="text-[10px] text-psu-gray/40 truncate">{selectedSubmission.siteName}</p>
                      </div>
                    </div>
                    <span className={statusBadgeClass(selectedSubmission.status)}>{statusLabel(selectedSubmission.status)}</span>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-psu-gray/30 uppercase tracking-[0.2em] border-b border-psu-gray/5 pb-2">{t('supervisorHK.checklistTitle')}</h4>
                    {selectedSubmission.items.map((item, idx) => (
                      <div key={idx} className="bg-white border border-psu-gray/10 p-4 rounded-2xl">
                        <div className="flex justify-between items-start gap-4">
                          <p className="text-xs font-bold text-psu-gray leading-relaxed">{item.question}</p>
                          <span className={cn(
                            "text-[9px] font-black px-2 py-1 rounded-md shrink-0",
                            item.answer === true ? "bg-psu-green/10 text-psu-green" : "bg-psu-blue/10 text-psu-blue"
                          )}>
                            {item.answer === true ? t('supervisorHK.pass') : item.answer === false ? t('supervisorHK.fail') : item.answer}
                          </span>
                        </div>
                        {item.photoUrl && (
                          <div className="mt-4 rounded-xl overflow-hidden border border-psu-gray/5">
                            <img src={item.photoUrl} className="w-full h-40 object-cover" alt="Proof" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {selectedSubmission.rejectionReason && (
                    <div className="bg-psu-rejected/5 border border-psu-rejected/10 p-4 rounded-2xl">
                      <p className="text-[10px] font-black text-psu-rejected uppercase tracking-widest mb-1">{t('common.rejected')}</p>
                      <p className="text-xs text-psu-gray/70">{selectedSubmission.rejectionReason}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
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
              className="bg-white w-full max-w-sm rounded-[32px] p-10 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              {justCreated ? (
                <>
                  <div className="flex flex-col items-center mb-8 text-center">
                    <div className="w-16 h-16 bg-psu-green/10 rounded-2xl flex items-center justify-center text-psu-green mb-4">
                      <Check size={32} />
                    </div>
                    <h3 className="text-xl font-bold tracking-tight text-psu-gray">{t('admin.accountReadyTitle')}</h3>
                    <p className="text-xs text-psu-gray/50 font-medium mt-2 leading-relaxed">
                      {t('admin.accountReadyBody', { name: justCreated.name })}
                    </p>
                  </div>

                  <div className="bg-psu-bg border border-psu-gray/10 rounded-2xl p-4 mb-4">
                    <p className="text-xs text-psu-gray whitespace-pre-line leading-relaxed">{credentialsMessage}</p>
                  </div>

                  <button
                    type="button"
                    onClick={copyInviteMessage}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all mb-3",
                      inviteCopied ? "bg-psu-green/10 text-psu-green" : "bg-psu-blue text-white shadow-lg shadow-psu-blue/20 active:scale-95"
                    )}
                  >
                    {inviteCopied ? <Check size={16} /> : <Copy size={16} />}
                    {inviteCopied ? t('admin.copied') : t('admin.copyCredentials')}
                  </button>

                  <button
                    type="button"
                    onClick={closeAddModal}
                    className="w-full py-3 text-psu-gray/40 font-black text-[10px] uppercase tracking-widest"
                  >
                    {t('common.close')}
                  </button>
                </>
              ) : (
                <>
                  <div className="flex flex-col items-center mb-10">
                    <div className="w-16 h-16 bg-psu-green/10 rounded-2xl flex items-center justify-center text-psu-green mb-4">
                      <UserPlus size={32} />
                    </div>
                    <h3 className="text-xl font-bold tracking-tight text-psu-gray">{t('admin.addUserTitle')}</h3>
                    <p className="text-[10px] text-psu-gray/40 font-black uppercase tracking-widest mt-2">{t('admin.addUserSubtitle')}</p>
                  </div>

                  {isFirebaseConfigured && (
                    <p className="text-[11px] text-psu-blue/70 bg-psu-blue/5 rounded-xl p-3 mb-5 leading-snug">{t('admin.instantAccountHint')}</p>
                  )}
                  
                  <form onSubmit={handleAddUser} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-psu-gray/40 uppercase mb-2 tracking-widest">{t('admin.firstNameLabel')}</label>
                        <input 
                          required
                          type="text" 
                          value={newUser.firstName}
                          onChange={(e) => setNewUser(p => ({ ...p, firstName: e.target.value }))}
                          className="w-full p-4 bg-psu-bg border border-psu-gray/10 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-psu-green/20 transition-all"
                          placeholder={t('admin.firstNamePlaceholder')}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-psu-gray/40 uppercase mb-2 tracking-widest">{t('admin.lastNameLabel')}</label>
                        <input 
                          type="text" 
                          value={newUser.lastName}
                          onChange={(e) => setNewUser(p => ({ ...p, lastName: e.target.value }))}
                          className="w-full p-4 bg-psu-bg border border-psu-gray/10 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-psu-green/20 transition-all"
                          placeholder={t('admin.lastNamePlaceholder')}
                        />
                      </div>
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

                    {isFirebaseConfigured && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest">{t('auth.passwordLabel')}</label>
                          <button
                            type="button"
                            onClick={() => setPassword(generatePassword())}
                            className="flex items-center gap-1 text-[9px] font-black text-psu-blue uppercase tracking-widest"
                          >
                            <RefreshCw size={11} />
                            {t('admin.regenerate')}
                          </button>
                        </div>
                        <div className="relative">
                          <input
                            required
                            minLength={6}
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-4 pr-12 bg-psu-bg border border-psu-gray/10 rounded-2xl text-sm font-mono font-medium focus:outline-none focus:ring-2 focus:ring-psu-green/20 transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(s => !s)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-psu-gray/30"
                            aria-label={showPassword ? t('admin.hidePassword') : t('admin.showPassword')}
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                        <p className="text-[10px] text-psu-gray/40 font-medium mt-2">{t('admin.passwordEditableNote')}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-psu-gray/40 uppercase mb-2 tracking-widest">{t('admin.roleLabel')}</label>
                        <select 
                          value={newUser.role}
                          onChange={(e) => setNewUser(p => ({ ...p, role: e.target.value as any }))}
                          className="w-full p-4 bg-psu-bg border border-psu-gray/10 rounded-2xl text-[10px] font-black uppercase tracking-tighter"
                        >
                          <option value="HOUSEKEEPER">{t('rolesShort.HOUSEKEEPER')}</option>
                          <option value="HOUSEKEEPING_SUPERVISOR">{t('rolesShort.HOUSEKEEPING_SUPERVISOR')}</option>
                          <option value="HOUSEKEEPING_MANAGER">{t('rolesShort.HOUSEKEEPING_MANAGER')}</option>
                          <option value="FOOD_SAFETY_TECHNICIAN">{t('rolesShort.FOOD_SAFETY_TECHNICIAN')}</option>
                          <option value="FOOD_SAFETY_SUPERVISOR">{t('rolesShort.FOOD_SAFETY_SUPERVISOR')}</option>
                          <option value="FOOD_SAFETY_MANAGER">{t('rolesShort.FOOD_SAFETY_MANAGER')}</option>
                          <option value="GENERAL_MANAGER">{t('rolesShort.GENERAL_MANAGER')}</option>
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

                    {addUserError && (
                      <div className="flex items-start gap-2 p-3 bg-red-50 text-psu-rejected text-xs rounded-xl border border-red-100 font-medium">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                        <span>{addUserError}</span>
                      </div>
                    )}

                    <div className="flex gap-4 pt-6">
                      <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 text-psu-gray/40 font-black text-[10px] uppercase tracking-widest">{t('common.cancel')}</button>
                      <button 
                        type="submit"
                        disabled={isCreatingUser}
                        className="flex-[2] py-4 bg-psu-green text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-psu-green/20 active:scale-95 transition-all disabled:opacity-60"
                      >
                        {isCreatingUser ? t('common.loading') : t('admin.addButton')}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-psu-gray/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl"
            >
              <div className="flex flex-col items-center mb-6 text-center">
                <div className="w-16 h-16 bg-psu-rejected/10 rounded-2xl flex items-center justify-center text-psu-rejected mb-4">
                  <Trash2 size={28} />
                </div>
                <h3 className="text-lg font-bold tracking-tight text-psu-gray">{t('admin.deleteConfirmTitle')}</h3>
                <p className="text-xs text-psu-gray/60 font-medium mt-2 leading-relaxed">
                  {t('admin.deleteConfirmBody', { name: deleteTarget.name })}
                </p>
              </div>

              {isFirebaseConfigured && (
                <p className="text-[11px] text-psu-gray/50 bg-psu-bg rounded-xl p-3 mb-5 leading-snug">
                  {t('admin.deleteConfirmAuthNote')}
                </p>
              )}

              <label className="block text-[10px] font-black text-psu-gray/40 uppercase mb-2 tracking-widest">
                {t('admin.deleteTypeToConfirm')}
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={t('admin.deleteInputPlaceholder')}
                className="w-full p-4 bg-psu-bg border border-psu-gray/10 rounded-2xl text-sm font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-psu-rejected/20 transition-all mb-6"
                autoFocus
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-4 text-psu-gray/40 font-black text-[10px] uppercase tracking-widest"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  disabled={deleteConfirmText !== 'DELETE'}
                  onClick={() => {
                    deleteUser(deleteTarget.id);
                    setDeleteTarget(null);
                  }}
                  className="flex-[2] py-4 bg-psu-rejected text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-psu-rejected/20 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {t('admin.deleteButton')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {resetTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-psu-gray/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              {resetSuccess ? (
                <>
                  <div className="flex flex-col items-center mb-6 text-center">
                    <div className="w-16 h-16 bg-psu-green/10 rounded-2xl flex items-center justify-center text-psu-green mb-4">
                      <Check size={28} />
                    </div>
                    <h3 className="text-lg font-bold tracking-tight text-psu-gray">{t('admin.resetSuccessTitle')}</h3>
                    <p className="text-xs text-psu-gray/60 font-medium mt-2 leading-relaxed">
                      {t('admin.resetSuccessBody', { name: resetTarget.name })}
                    </p>
                  </div>
                  <div className="bg-psu-bg border border-psu-gray/10 rounded-2xl p-4 mb-6 text-xs text-psu-gray space-y-1">
                    <p><span className="font-black uppercase text-[9px] text-psu-gray/40 tracking-widest mr-2">{t('auth.emailLabel')}</span>{resetEmail.trim().toLowerCase()}</p>
                    {resetPassword && (
                      <p><span className="font-black uppercase text-[9px] text-psu-gray/40 tracking-widest mr-2">{t('auth.passwordLabel')}</span>{resetPassword}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={closeResetModal}
                    className="w-full py-4 bg-psu-green text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-psu-green/20 active:scale-95 transition-all"
                  >
                    {t('common.close')}
                  </button>
                </>
              ) : (
                <>
                  <div className="flex flex-col items-center mb-8 text-center">
                    <div className="w-16 h-16 bg-psu-blue/10 rounded-2xl flex items-center justify-center text-psu-blue mb-4">
                      <KeyRound size={28} />
                    </div>
                    <h3 className="text-lg font-bold tracking-tight text-psu-gray">{t('admin.resetLoginTitle')}</h3>
                    <p className="text-xs text-psu-gray/60 font-medium mt-2 leading-relaxed">
                      {t('admin.resetLoginBody', { name: resetTarget.name })}
                    </p>
                  </div>

                  <form onSubmit={handleResetCredentials} className="space-y-5">
                    <div>
                      <label className="block text-[10px] font-black text-psu-gray/40 uppercase mb-2 tracking-widest">{t('auth.emailLabel')}</label>
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="w-full p-4 bg-psu-bg border border-psu-gray/10 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-psu-blue/20 transition-all"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest">{t('admin.resetNewPasswordLabel')}</label>
                        <button
                          type="button"
                          onClick={() => setResetPassword(generatePassword())}
                          className="flex items-center gap-1 text-[9px] font-black text-psu-blue uppercase tracking-widest"
                        >
                          <RefreshCw size={11} />
                          {t('admin.regenerate')}
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showResetPassword ? 'text' : 'password'}
                          minLength={6}
                          value={resetPassword}
                          onChange={(e) => setResetPassword(e.target.value)}
                          placeholder={t('admin.resetNewPasswordPlaceholder')}
                          className="w-full p-4 pr-12 bg-psu-bg border border-psu-gray/10 rounded-2xl text-sm font-mono font-medium focus:outline-none focus:ring-2 focus:ring-psu-blue/20 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowResetPassword(s => !s)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-psu-gray/30"
                          aria-label={showResetPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                        >
                          {showResetPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      <p className="text-[10px] text-psu-gray/40 font-medium mt-2">{t('admin.resetNewPasswordNote')}</p>
                    </div>

                    {resetError && (
                      <div className="flex items-start gap-2 p-3 bg-psu-rejected/5 text-psu-rejected text-xs rounded-xl">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                        <span>{resetError}</span>
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={closeResetModal}
                        className="flex-1 py-4 text-psu-gray/40 font-black text-[10px] uppercase tracking-widest"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        type="submit"
                        disabled={isResetting}
                        className="flex-[2] py-4 bg-psu-blue text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-psu-blue/20 active:scale-95 transition-all disabled:opacity-60"
                      >
                        {isResetting ? t('common.loading') : t('admin.resetLoginButton')}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
