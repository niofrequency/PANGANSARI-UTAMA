import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import {
  Users, UserPlus, Trash2, Search, AlertTriangle, Copy, Check, Eye, EyeOff, RefreshCw, KeyRound, Hash,
} from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { cn } from '../../utils/cn';
import { UserRole, User, Site } from '../../types';
import { useTranslation } from '../../i18n/LanguageContext';
import { SUPER_ADMIN_EMAIL } from '../../services/authService';
import { isFirebaseConfigured } from '../../lib/firebase';
import { Modal } from '../Modal';
import { ListCard } from '../ListCard';
import { isValidStaffCode } from '../../utils/staffCode';
import { SiteOptions, groupSitesByArea } from '../SiteOptions';

// Personnel management (add / remove / reset login / Staff ID / role /
// site) — shared by the Admin Portal's Personnel tab and the Manager
// Portal's Users tab. `canManageAdmins` is the one difference between
// them: an Admin can grant/revoke ADMIN and edit/remove other admins; a
// Manager (Housekeeping/Food Safety/General) can manage everyone else but
// never sees the ADMIN role option and can't touch an ADMIN account.
// firestore.rules (isManager) and functions/src/index.ts
// (adminResetCredentials) enforce the same limit server-side.

const ALL_ROLES: UserRole[] = [
  'HOUSEKEEPER',
  'HOUSEKEEPING_LAUNDRY',
  'HOUSEKEEPING_JANITOR',
  'HOUSEKEEPING_LEADHAND',
  'HOUSEKEEPING_SUPERVISOR',
  'HOUSEKEEPING_MANAGER',
  'FOOD_SAFETY_TECHNICIAN',
  'FOOD_SAFETY_LEADHAND',
  'FOOD_SAFETY_SUPERVISOR',
  'FOOD_SAFETY_MANAGER',
  'GENERAL_MANAGER',
  'ADMIN',
];

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

type SiteAccessValue = string[] | 'ALL' | undefined;

function siteAccessMode(value: SiteAccessValue): 'home' | 'all' | 'custom' {
  if (value === 'ALL') return 'all';
  if (Array.isArray(value)) return 'custom';
  return 'home';
}

// Which sites a Supervisor/Manager/GM can review — see lib/siteScope.ts.
// Shared between the per-user Personnel card and the Add Staff form so
// both get the exact same 3-way picker (Home Site / All Sites / Custom)
// instead of two hand-rolled copies drifting apart.
function SiteAccessPicker({
  sites, homeSite, value, onChange,
}: {
  sites: Site[];
  homeSite: string; // fallback for "Custom" starting point, and the last-site guard below
  value: SiteAccessValue;
  onChange: (next: SiteAccessValue) => void;
}) {
  const { t } = useTranslation();
  const mode = siteAccessMode(value);
  const customSites = Array.isArray(value) ? value : [homeSite];

  const pillClass = (active: boolean) => cn(
    "flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all",
    active ? "bg-psu-blue text-white" : "bg-psu-bg text-psu-gray/40 border border-psu-gray/10"
  );

  return (
    <div>
      <label className="block text-[9px] font-black text-psu-gray/30 uppercase tracking-widest mb-1.5">{t('admin.siteAccessLabel')}</label>
      <div className="flex gap-1.5">
        <button type="button" onClick={() => onChange(undefined)} className={pillClass(mode === 'home')}>{t('admin.siteAccessHome')}</button>
        <button type="button" onClick={() => onChange('ALL')} className={pillClass(mode === 'all')}>{t('admin.siteAccessAll')}</button>
        <button type="button" onClick={() => onChange(mode === 'custom' ? customSites : [homeSite])} className={pillClass(mode === 'custom')}>{t('admin.siteAccessCustom')}</button>
      </div>
      {mode === 'custom' && (
        <div className="mt-2 p-2 bg-psu-bg rounded-xl max-h-64 overflow-y-auto space-y-2">
          {groupSitesByArea(sites).map(g => (
            <div key={g.area}>
              <p className="text-[8px] font-black text-psu-gray/30 uppercase tracking-widest mb-1">{g.label}</p>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          {g.sites.map(site => {
            const checked = customSites.includes(site.id);
            return (
              <label key={site.id} className="flex items-center gap-1.5 text-[9px] font-bold text-psu-gray/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...customSites, site.id]
                      : customSites.filter(id => id !== site.id);
                    // Never leave a Supervisor/Manager scoped to zero
                    // sites — that's not "narrower," it's a queue that
                    // silently shows nothing.
                    onChange(next.length > 0 ? next : [homeSite]);
                  }}
                />
                <span className="truncate">{site.name}</span>
              </label>
            );
          })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function UserManagementPanel({
  store,
  canManageAdmins,
}: {
  store: ReturnType<typeof useAppStore>;
  canManageAdmins: boolean;
}) {
  const { t } = useTranslation();
  const { users, sites, addUser, updateUserRole, updateUserSite, updateUserAssignedSites, resetUserCredentials, setStaffIdentity, deleteUser } = store;
  const roleOptions = canManageAdmins ? ALL_ROLES : ALL_ROLES.filter(r => r !== 'ADMIN');
  // Accounts this viewer may edit/remove: never the bootstrap super-admin,
  // and for a Manager, never any ADMIN account either.
  const canEdit = (user: User) =>
    user.email.toLowerCase() !== SUPER_ADMIN_EMAIL && (canManageAdmins || user.role !== 'ADMIN');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ firstName: '', lastName: '', email: '', role: 'HOUSEKEEPER' as UserRole, site: 'site-1', assignedSites: undefined as SiteAccessValue });
  const [password, setPassword] = useState(() => generatePassword());
  // Optional Scan-to-Job Staff ID, assignable right when the account is
  // created (not just afterward via the per-user "Staff ID" button below).
  const [newStaffCode, setNewStaffCode] = useState('');
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

  // Staff ID modal — sets/changes a user's Scan-to-Job Staff ID (see
  // StaffIdGate.tsx). No PIN — the code itself is the credential.
  // Available in both Firebase and demo mode, unlike Reset Login above
  // (which genuinely needs a Cloud Function).
  const [staffIdTarget, setStaffIdTarget] = useState<User | null>(null);
  const [staffIdCode, setStaffIdCode] = useState('');
  const [isSavingStaffId, setIsSavingStaffId] = useState(false);
  const [staffIdError, setStaffIdError] = useState('');
  const [staffIdSuccess, setStaffIdSuccess] = useState(false);

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

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

    const staffCodeTrim = newStaffCode.trim();
    if (staffCodeTrim && !isValidStaffCode(staffCodeTrim)) {
      setAddUserError(t('admin.staffIdInvalidCode'));
      return;
    }

    setIsCreatingUser(true);
    const result = await addUser(
      { ...newUser, name },
      password,
      staffCodeTrim ? { staffCode: staffCodeTrim } : undefined
    );
    setIsCreatingUser(false);

    if (!result.ok) {
      setAddUserError(
        result.error === 'already-exists' ? t('admin.emailAlreadyExists')
          : result.error === 'staffcode-taken' ? t('admin.staffIdTaken')
          : t('admin.createAccountFailed')
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
    setNewUser({ firstName: '', lastName: '', email: '', role: 'HOUSEKEEPER', site: 'site-1', assignedSites: undefined });
    setPassword(generatePassword());
    setNewStaffCode('');
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

  const openStaffIdModal = (user: User) => {
    setStaffIdTarget(user);
    setStaffIdCode(user.staffCode || '');
    setStaffIdError('');
    setStaffIdSuccess(false);
  };

  const closeStaffIdModal = () => setStaffIdTarget(null);

  const handleSaveStaffId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffIdTarget) return;
    setStaffIdError('');
    const code = staffIdCode.trim();
    if (!isValidStaffCode(code)) {
      setStaffIdError(t('admin.staffIdInvalidCode'));
      return;
    }
    setIsSavingStaffId(true);
    const result = await setStaffIdentity(staffIdTarget.id, code);
    setIsSavingStaffId(false);
    if (!result.ok) {
      setStaffIdError(result.error === 'staffcode-taken' ? t('admin.staffIdTaken') : t('admin.createAccountFailed'));
      return;
    }
    setStaffIdSuccess(true);
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

  return (
    <>
      <div className="space-y-6">
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

            <ListCard
              items={filteredUsers}
              emptyIcon={<Users size={48} className="mx-auto" />}
              emptyLabel={t('common.noData')}
              renderRow={(user: User) => (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 bg-psu-bg rounded-2xl flex items-center justify-center text-psu-gray/20 shrink-0">
                      <Users size={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-psu-gray truncate">{user.name}</h4>
                      <p className="text-[10px] text-psu-gray/40 font-black uppercase tracking-widest mt-0.5 truncate">{t(`roles.${user.role}`)} • {user.email}</p>
                      {user.staffCode && (
                        <p className="text-[9px] text-psu-green font-black uppercase tracking-widest mt-0.5">{t('admin.staffIdLabelShort')} {user.staffCode}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={user.role}
                      disabled={!canEdit(user)}
                      onChange={(e) => updateUserRole(user.id, e.target.value as UserRole)}
                      className="flex-1 min-w-0 text-[9px] bg-psu-bg border border-psu-gray/10 rounded-md px-2 py-1.5 font-black uppercase tracking-tighter outline-none focus:ring-2 focus:ring-psu-blue/20 disabled:opacity-50 truncate"
                    >
                      {(roleOptions.includes(user.role) ? roleOptions : [...roleOptions, user.role]).map(r => <option key={r} value={r}>{t(`rolesShort.${r}`)}</option>)}
                    </select>
                    {canEdit(user) && isFirebaseConfigured && (
                      <button
                        onClick={() => openResetModal(user)}
                        className="p-2 rounded-xl transition-all shrink-0 text-psu-blue bg-psu-blue/5 hover:bg-psu-blue/10"
                        aria-label={t('admin.resetLoginButton')}
                      >
                        <KeyRound size={18} />
                      </button>
                    )}
                    {canEdit(user) && (
                      <button
                        onClick={() => openStaffIdModal(user)}
                        className="p-2 rounded-xl transition-all shrink-0 text-psu-green bg-psu-green/5 hover:bg-psu-green/10"
                        aria-label={t('admin.staffIdButton')}
                      >
                        <Hash size={18} />
                      </button>
                    )}
                    {canEdit(user) && user.id !== store.currentUser?.id && (
                      <button
                        onClick={() => { setDeleteTarget(user); setDeleteConfirmText(''); }}
                        className="p-2 rounded-xl transition-all shrink-0 text-psu-rejected bg-psu-rejected/5 hover:bg-psu-rejected/10"
                        aria-label={t('admin.deleteButton')}
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>

                  {canEdit(user) && (
                    <select
                      value={user.site}
                      onChange={(e) => updateUserSite(user.id, e.target.value)}
                      className="w-full text-[9px] bg-psu-bg border border-psu-gray/10 rounded-md px-2 py-1.5 font-black uppercase tracking-tighter outline-none focus:ring-2 focus:ring-psu-blue/20 truncate"
                    >
                      <SiteOptions sites={sites} />
                    </select>
                  )}

                  {/* Which sites this person can act on — a Supervisor/
                      Manager/GM's review scope (Field Queue, Escalations,
                      Dashboard, Ops Logs), or a frontline worker's set of
                      sites to submit for / scan a job QR at (see
                      hooks/useWorkingSite.ts). Separate from their Home
                      Site above, which stays their default/fallback site
                      either way. */}
                  {canEdit(user) && (
                    <SiteAccessPicker
                      sites={sites}
                      homeSite={user.site}
                      value={user.assignedSites}
                      onChange={(next) => updateUserAssignedSites(user.id, next ?? null)}
                    />
                  )}
                </div>
              )}
            />
      </div>

      {/* Add User Modal */}
      <AnimatePresence>
        {showAddModal && (
          <Modal size="lg" boxClassName="rounded-[32px] p-10 max-h-[90vh] overflow-y-auto">
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
                          {roleOptions.map(r => <option key={r} value={r}>{t(`rolesShort.${r}`)}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-psu-gray/40 uppercase mb-2 tracking-widest">{t('admin.siteLabel')}</label>
                        <select
                          value={newUser.site}
                          onChange={(e) => setNewUser(p => ({ ...p, site: e.target.value }))}
                          className="w-full p-4 bg-psu-bg border border-psu-gray/10 rounded-2xl text-[10px] font-black uppercase tracking-tighter"
                        >
                          <SiteOptions sites={sites} />
                        </select>
                      </div>
                    </div>

                    <SiteAccessPicker
                      sites={sites}
                      homeSite={newUser.site}
                      value={newUser.assignedSites}
                      onChange={(next) => setNewUser(p => ({ ...p, assignedSites: next }))}
                    />

                    <div>
                      <label className="block text-[10px] font-black text-psu-gray/40 uppercase mb-2 tracking-widest">{t('admin.staffIdOptionalLabel')}</label>
                      <input
                        type="text"
                        value={newStaffCode}
                        onChange={(e) => setNewStaffCode(e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 12))}
                        placeholder={t('staffIdGate.staffIdPlaceholder')}
                        className="w-full p-4 bg-psu-bg border border-psu-gray/10 rounded-2xl text-sm font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-psu-green/20 transition-all"
                      />
                      <p className="text-[10px] text-psu-gray/40 font-medium mt-2">{t('admin.staffIdOptionalNote')}</p>
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
          </Modal>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <Modal size="sm" boxClassName="rounded-[32px] p-8">
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
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {resetTarget && (
          <Modal size="md" boxClassName="rounded-[32px] p-8 max-h-[90vh] overflow-y-auto">
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
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {staffIdTarget && (
          <Modal size="md" boxClassName="rounded-[32px] p-8 max-h-[90vh] overflow-y-auto">
              {staffIdSuccess ? (
                <>
                  <div className="flex flex-col items-center mb-6 text-center">
                    <div className="w-16 h-16 bg-psu-green/10 rounded-2xl flex items-center justify-center text-psu-green mb-4">
                      <Check size={28} />
                    </div>
                    <h3 className="text-lg font-bold tracking-tight text-psu-gray">{t('admin.staffIdSuccessTitle')}</h3>
                    <p className="text-xs text-psu-gray/60 font-medium mt-2 leading-relaxed">
                      {t('admin.staffIdSuccessBody', { name: staffIdTarget.name })}
                    </p>
                  </div>
                  <div className="bg-psu-bg border border-psu-gray/10 rounded-2xl p-4 mb-6 text-xs text-psu-gray space-y-1">
                    <p><span className="font-black uppercase text-[9px] text-psu-gray/40 tracking-widest mr-2">{t('staffIdGate.staffIdLabel')}</span>{staffIdCode.trim()}</p>
                  </div>
                  <button
                    type="button"
                    onClick={closeStaffIdModal}
                    className="w-full py-4 bg-psu-green text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-psu-green/20 active:scale-95 transition-all"
                  >
                    {t('common.close')}
                  </button>
                </>
              ) : (
                <>
                  <div className="flex flex-col items-center mb-8 text-center">
                    <div className="w-16 h-16 bg-psu-green/10 rounded-2xl flex items-center justify-center text-psu-green mb-4">
                      <Hash size={28} />
                    </div>
                    <h3 className="text-lg font-bold tracking-tight text-psu-gray">{t('admin.staffIdTitle')}</h3>
                    <p className="text-xs text-psu-gray/60 font-medium mt-2 leading-relaxed">
                      {t('admin.staffIdBody', { name: staffIdTarget.name })}
                    </p>
                  </div>

                  <form onSubmit={handleSaveStaffId} className="space-y-5">
                    <div>
                      <label className="block text-[10px] font-black text-psu-gray/40 uppercase mb-2 tracking-widest">{t('staffIdGate.staffIdLabel')}</label>
                      <input
                        type="text"
                        value={staffIdCode}
                        onChange={(e) => setStaffIdCode(e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 12))}
                        placeholder={t('staffIdGate.staffIdPlaceholder')}
                        className="w-full p-4 bg-psu-bg border border-psu-gray/10 rounded-2xl text-sm font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-psu-green/20 transition-all"
                      />
                      <p className="text-[10px] text-psu-gray/40 font-medium mt-2">{t('admin.staffIdNote')}</p>
                    </div>

                    {staffIdError && (
                      <div className="flex items-start gap-2 p-3 bg-psu-rejected/5 text-psu-rejected text-xs rounded-xl">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                        <span>{staffIdError}</span>
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={closeStaffIdModal}
                        className="flex-1 py-4 text-psu-gray/40 font-black text-[10px] uppercase tracking-widest"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingStaffId}
                        className="flex-[2] py-4 bg-psu-green text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-psu-green/20 active:scale-95 transition-all disabled:opacity-60"
                      >
                        {isSavingStaffId ? t('common.loading') : t('admin.staffIdSaveButton')}
                      </button>
                    </div>
                  </form>
                </>
              )}
          </Modal>
        )}
      </AnimatePresence>
    </>
  );
}
