import { useState, useEffect, useRef, useCallback } from "react";

// ---- TYPES ----
type Screen =
  | "onboarding" | "registration" | "login" | "user-dashboard"
  | "chat-app" | "portal-selection" | "admin-gate" | "admin-dashboard"
  | "student-portal" | "lesson-viewer" | "teacher-portal" | "teacher-lesson-viewer";

type ChatView = "landing" | "dashboard" | "contacts" | "room" | "group-room";
type ChatModal = null | "view-profile" | "profile-pic" | "edit-profile" | "create-group" | "edit-group";

interface Lesson { id: number; section: string; class: string; term: number; title: string; fileName: string; }
interface AppContact { id: number; name: string; img: string; }
interface Message { text: string; sent: boolean; }
interface ChatProfile { name: string; bio: string; phone: string; email: string; img: string; }
interface Group { id: number; name: string; description: string; img: string; memberIds: number[]; }

const ADMIN_CREDS = { user: "Samuel Chibuike Azubuike", pass: "Lordmayor" };
const MAX_GROUP_MEMBERS = 1000;

const PALETTE_COLORS = [
  { name: "Emerald",  value: "#25d366" },
  { name: "Teal",    value: "#008069" },
  { name: "Blue",    value: "#3b82f6" },
  { name: "Indigo",  value: "#4f46e5" },
  { name: "Purple",  value: "#8b5cf6" },
  { name: "Pink",    value: "#ec4899" },
  { name: "Orange",  value: "#f97316" },
  { name: "Red",     value: "#ef4444" },
  { name: "Slate",   value: "#475569" },
];

const APP_CONTACTS: AppContact[] = [
  { id: 1, name: "Sarah", img: "https://i.pravatar.cc/150?u=1" },
  { id: 2, name: "John Doe", img: "https://i.pravatar.cc/150?u=2" },
  { id: 3, name: "Toolifylab Team", img: "https://i.pravatar.cc/150?u=3" },
  { id: 4, name: "Amaka Obi", img: "https://i.pravatar.cc/150?u=4" },
  { id: 5, name: "Chidi Nwosu", img: "https://i.pravatar.cc/150?u=5" },
];

// ---- TOAST ----
interface ToastItem { id: number; message: string; }
function ToastContainer({ toasts, onRemove }: { toasts: ToastItem[]; onRemove: (id: number) => void }) {
  useEffect(() => {
    toasts.forEach(t => { const timer = setTimeout(() => onRemove(t.id), 3000); return () => clearTimeout(timer); });
  }, [toasts, onRemove]);
  return <div className="toast-container">{toasts.map(t => <div key={t.id} className="toast">{t.message}</div>)}</div>;
}

// ---- MAIN APP ----
export default function App() {
  // Core
  const [screen, setScreen] = useState<Screen>("onboarding");
  const [theme, setTheme] = useState<"light" | "dark">(() => (localStorage.getItem("zapphub_theme") as "light" | "dark") || "light");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [userEmail, setUserEmail] = useState("user@zapphub.com");
  const [profileImg, setProfileImg] = useState<string>(localStorage.getItem("zapphub_user_image") || "");
  const [db, setDb] = useState<Lesson[]>(() => JSON.parse(localStorage.getItem("zapphub_db") || "[]"));

  // Registration / Login
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");

  // Chat navigation
  const [chatView, setChatView] = useState<ChatView>("landing");
  const [activeContact, setActiveContact] = useState<AppContact | null>(null);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [activeChats, setActiveChats] = useState<AppContact[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [groupMessages, setGroupMessages] = useState<Record<number, Message[]>>({});
  const [chatInput, setChatInput] = useState("");
  const [chatBubbleColor, setChatBubbleColor] = useState<string>(
    () => localStorage.getItem("zapphub_bubble_color") || "#25d366"
  );

  // Chat profile (auto-filled from registration)
  const [chatProfile, setChatProfile] = useState<ChatProfile>(() => {
    const saved = localStorage.getItem("zapphub_chat_profile");
    return saved ? JSON.parse(saved) : { name: "", bio: "", phone: "", email: "", img: "" };
  });

  // Chat menu & modals
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [chatModal, setChatModal] = useState<ChatModal>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Draft states for modals
  const [draftProfile, setDraftProfile] = useState<ChatProfile>({ name: "", bio: "", phone: "", email: "", img: "" });
  const [draftGroup, setDraftGroup] = useState({ name: "", description: "", img: "", memberIds: [] as number[] });
  const [editGroupId, setEditGroupId] = useState<number | null>(null);

  // Groups
  const [groups, setGroups] = useState<Group[]>(() => JSON.parse(localStorage.getItem("zapphub_groups") || "[]"));

  // File refs
  const profileInputRef = useRef<HTMLInputElement>(null);
  const chatPicInputRef = useRef<HTMLInputElement>(null);
  const groupPicInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Admin
  const [adminView, setAdminView] = useState<"main" | "classes" | "terms">("main");
  const [activeSection, setActiveSection] = useState("");
  const [activeClass, setActiveClass] = useState("");
  const [openTerm, setOpenTerm] = useState<number | null>(null);
  const [termTitles, setTermTitles] = useState<{ [k: number]: string }>({ 1: "", 2: "", 3: "" });
  const [termFiles, setTermFiles] = useState<{ [k: number]: File | null }>({ 1: null, 2: null, 3: null });
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");

  // Student / Teacher portal
  const [selectedStudentClass, setSelectedStudentClass] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeacherClass, setSelectedTeacherClass] = useState<string | null>(null);
  const [teacherSearchQuery, setTeacherSearchQuery] = useState("");
  const [viewLesson, setViewLesson] = useState<Lesson | null>(null);
  const [lessonReturnScreen, setLessonReturnScreen] = useState<Screen>("student-portal");

  // ---- EFFECTS ----
  useEffect(() => { document.body.setAttribute("data-theme", theme); localStorage.setItem("zapphub_theme", theme); }, [theme]);
  useEffect(() => { localStorage.setItem("zapphub_db", JSON.stringify(db)); }, [db]);
  useEffect(() => { localStorage.setItem("zapphub_groups", JSON.stringify(groups)); }, [groups]);
  useEffect(() => { localStorage.setItem("zapphub_chat_profile", JSON.stringify(chatProfile)); }, [chatProfile]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, groupMessages]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setChatMenuOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // ---- HELPERS ----
  const showToast = useCallback((msg: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message: msg }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);
  const removeToast = useCallback((id: number) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  const goTo = useCallback((s: Screen) => {
    if (s === "student-portal") { setSelectedStudentClass(null); setSearchQuery(""); }
    if (s === "teacher-portal") { setSelectedTeacherClass(null); setTeacherSearchQuery(""); }
    if (s === "admin-dashboard") setAdminView("main");
    setScreen(s);
  }, []);

  // ---- MAIN PROFILE ----
  function handleProfilePic(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { const r = ev.target?.result as string; setProfileImg(r); localStorage.setItem("zapphub_user_image", r); };
    reader.readAsDataURL(file);
  }

  // ---- CHAT FUNCTIONS ----
  function startChat(contact: AppContact) {
    if (!activeChats.find(c => c.id === contact.id)) setActiveChats(prev => [...prev, contact]);
    setActiveContact(contact);
    setMessages([]);
    setChatView("room");
  }

  function openGroupRoom(group: Group) {
    setActiveGroup(group);
    setChatView("group-room");
  }

  function sendMessage() {
    if (!chatInput.trim()) return;
    setMessages(prev => [...prev, { text: chatInput.trim(), sent: true }]);
    setChatInput("");
  }

  function sendGroupMessage() {
    if (!chatInput.trim() || !activeGroup) return;
    setGroupMessages(prev => ({
      ...prev,
      [activeGroup.id]: [...(prev[activeGroup.id] || []), { text: chatInput.trim(), sent: true }],
    }));
    setChatInput("");
  }

  // ---- CHAT MODAL FUNCTIONS ----
  function openChatModal(modal: ChatModal) {
    setChatMenuOpen(false);
    if (modal === "edit-profile") setDraftProfile({ ...chatProfile });
    if (modal === "create-group") setDraftGroup({ name: "", description: "", img: "", memberIds: [] });
    if (modal === "edit-group") setEditGroupId(null);
    setChatModal(modal);
  }

  function closeChatModal() { setChatModal(null); setEditGroupId(null); }

  function handleChatPic(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const r = ev.target?.result as string;
      setChatProfile(prev => ({ ...prev, img: r }));
      showToast("Profile picture updated!");
    };
    reader.readAsDataURL(file);
  }

  function handleGroupPic(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { const r = ev.target?.result as string; setDraftGroup(prev => ({ ...prev, img: r })); };
    reader.readAsDataURL(file);
  }

  function saveProfile() {
    if (!draftProfile.name.trim()) { showToast("Full name is required"); return; }
    setChatProfile(draftProfile);
    closeChatModal();
    showToast("Profile saved!");
  }

  function toggleGroupMember(id: number) {
    setDraftGroup(prev => {
      if (prev.memberIds.includes(id)) return { ...prev, memberIds: prev.memberIds.filter(m => m !== id) };
      if (prev.memberIds.length >= MAX_GROUP_MEMBERS) { showToast(`Max ${MAX_GROUP_MEMBERS} members`); return prev; }
      return { ...prev, memberIds: [...prev.memberIds, id] };
    });
  }

  async function importFromPhone() {
    if (!("contacts" in navigator)) {
      showToast("Phone contacts not available on this browser. Use a compatible mobile browser.");
      return;
    }
    try {
      const result = await (navigator as any).contacts.select(["name", "tel", "email"], { multiple: true });
      let added = 0;
      result.forEach((c: any) => {
        if (draftGroup.memberIds.length + added < MAX_GROUP_MEMBERS) added++;
      });
      showToast(added > 0 ? `${added} contact(s) ready to add` : "No contacts selected");
    } catch {
      showToast("Contact import cancelled");
    }
  }

  function createGroup() {
    if (!draftGroup.name.trim()) { showToast("Group name is required"); return; }
    const newGroup: Group = { id: Date.now(), name: draftGroup.name.trim(), description: draftGroup.description, img: draftGroup.img, memberIds: draftGroup.memberIds };
    setGroups(prev => [...prev, newGroup]);
    closeChatModal();
    showToast(`Group "${newGroup.name}" created!`);
  }

  function startEditGroup(group: Group) {
    setDraftGroup({ name: group.name, description: group.description, img: group.img, memberIds: [...group.memberIds] });
    setEditGroupId(group.id);
  }

  function saveGroup() {
    if (!draftGroup.name.trim()) { showToast("Group name is required"); return; }
    setGroups(prev => prev.map(g => g.id === editGroupId ? { ...g, name: draftGroup.name.trim(), description: draftGroup.description, img: draftGroup.img, memberIds: draftGroup.memberIds } : g));
    closeChatModal();
    showToast("Group updated!");
  }

  function deleteGroup(id: number) {
    setGroups(prev => prev.filter(g => g.id !== id));
    closeChatModal();
    showToast("Group deleted");
  }

  // ---- ADMIN ----
  function verifyAdmin() {
    if (adminUser.trim() === ADMIN_CREDS.user && adminPass === ADMIN_CREDS.pass) { goTo("admin-dashboard"); setAdminUser(""); setAdminPass(""); }
    else showToast("Unauthorized Access");
  }
  function showSection(type: string) { setActiveSection(type); setAdminView("classes"); }
  function selectClass(c: string) { setActiveClass(c); setAdminView("terms"); setOpenTerm(null); setTermTitles({ 1: "", 2: "", 3: "" }); setTermFiles({ 1: null, 2: null, 3: null }); }
  function uploadLesson(n: number) {
    const t = termTitles[n]; const f = termFiles[n];
    if (!t || !f) { showToast("Fill all fields"); return; }
    setDb(prev => [...prev, { id: Date.now(), section: activeSection, class: activeClass, term: n, title: t, fileName: f.name }]);
    setTermTitles(prev => ({ ...prev, [n]: "" }));
    setTermFiles(prev => ({ ...prev, [n]: null }));
    showToast("Lesson uploaded!");
  }
  function deleteItem(id: number) { setDb(prev => prev.filter(i => i.id !== id)); }
  function adminBackward() { if (adminView === "terms") setAdminView("classes"); else if (adminView === "classes") setAdminView("main"); else goTo("portal-selection"); }
  function adminForward() { if (adminView === "main") showToast("Select a section first"); else if (adminView === "classes") showToast("Select a class first"); else showToast("You are at the deepest level"); }
  function toggleTerm(n: number) { setOpenTerm(prev => prev === n ? null : n); }
  const classOptions = (type: string) => type === "Primary" ? ["Primary 1","Primary 2","Primary 3","Primary 4","Primary 5","Primary 6"] : type === "JSS" ? ["JSS 1","JSS 2","JSS 3"] : ["SSS 1","SSS 2","SSS 3"];

  // ---- STUDENT / TEACHER ----
  const filteredLessons = db.filter(i => i.title.toLowerCase().includes(searchQuery.toLowerCase()) || i.class.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredTeacherLessons = db.filter(i => i.title.toLowerCase().includes(teacherSearchQuery.toLowerCase()) || i.class.toLowerCase().includes(teacherSearchQuery.toLowerCase()));
  function openLesson(id: number) { const l = db.find(i => i.id === id); if (!l) return; setViewLesson(l); setLessonReturnScreen("student-portal"); goTo("lesson-viewer"); }
  function openTeacherLesson(id: number) { const l = db.find(i => i.id === id); if (!l) return; setViewLesson(l); setLessonReturnScreen("teacher-portal"); goTo("teacher-lesson-viewer"); }

  // ---- SHARED MODAL RENDERER ----
  function renderChatModal() {
    if (!chatModal) return null;
    return (
      <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeChatModal(); }}>
        <div className="modal-box">

          {/* VIEW PROFILE MODAL */}
          {chatModal === "view-profile" && (
            <>
              <div className="modal-header">
                <h3>My Profile</h3>
                <button className="modal-close" onClick={closeChatModal}>×</button>
              </div>

              {/* Avatar */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
                <div className="profile-pic-preview"
                  style={chatProfile.img
                    ? { backgroundImage: `url(${chatProfile.img})` }
                    : { backgroundColor: "var(--wa-teal)" }}>
                  {!chatProfile.img && (chatProfile.name?.[0]?.toUpperCase() || "?")}
                </div>
                <h2 style={{ marginTop: 10, fontSize: 22, color: "var(--card-text)", textAlign: "center" }}>
                  {chatProfile.name || <span style={{ color: "var(--grey)", fontStyle: "italic" }}>No name set</span>}
                </h2>
              </div>

              {/* Details */}
              <div className="view-profile-fields">
                <div className="view-profile-row">
                  <span className="view-profile-label">Bio</span>
                  <span className="view-profile-value">
                    {chatProfile.bio || <span style={{ color: "var(--grey)", fontStyle: "italic" }}>No bio yet</span>}
                  </span>
                </div>
                <div className="view-profile-row">
                  <span className="view-profile-label">Phone</span>
                  <span className="view-profile-value">
                    {chatProfile.phone || <span style={{ color: "var(--grey)", fontStyle: "italic" }}>Not set</span>}
                  </span>
                </div>
                <div className="view-profile-row">
                  <span className="view-profile-label">Email</span>
                  <span className="view-profile-value">
                    {chatProfile.email || <span style={{ color: "var(--grey)", fontStyle: "italic" }}>Not set</span>}
                  </span>
                </div>
              </div>

              <button className="btn-blue gap-v" style={{ marginTop: 24 }} onClick={() => openChatModal("edit-profile")}>
                ✏️ Edit Profile
              </button>
              <button className="btn-white gap-v" onClick={closeChatModal}>Close</button>
            </>
          )}

          {/* PROFILE PICTURE MODAL */}
          {chatModal === "profile-pic" && (
            <>
              <div className="modal-header">
                <h3>Profile Picture</h3>
                <button className="modal-close" onClick={closeChatModal}>×</button>
              </div>
              <div className="profile-pic-preview"
                style={chatProfile.img ? { backgroundImage: `url(${chatProfile.img})` } : { backgroundColor: "var(--wa-teal)" }}>
                {!chatProfile.img && (chatProfile.name?.[0]?.toUpperCase() || "?")}
              </div>
              <input type="file" ref={chatPicInputRef} hidden accept="image/*" onChange={handleChatPic} />
              <button className="btn-blue" onClick={() => chatPicInputRef.current?.click()}>Choose Photo</button>
              {chatProfile.img && (
                <button className="btn-grey gap-v" onClick={() => { setChatProfile(prev => ({ ...prev, img: "" })); showToast("Photo removed"); }}>
                  Remove Photo
                </button>
              )}
              <button className="btn-white gap-v" onClick={closeChatModal}>Close</button>
            </>
          )}

          {/* EDIT PROFILE MODAL */}
          {chatModal === "edit-profile" && (
            <>
              <div className="modal-header">
                <h3>Edit Profile</h3>
                <button className="modal-close" onClick={closeChatModal}>×</button>
              </div>
              <label className="section-label">Full Name *</label>
              <input type="text" placeholder="Your full name" value={draftProfile.name}
                onChange={e => setDraftProfile(prev => ({ ...prev, name: e.target.value }))} />
              <label className="section-label">Bio</label>
              <textarea placeholder="Tell people about yourself..."
                maxLength={150}
                value={draftProfile.bio}
                onChange={e => setDraftProfile(prev => ({ ...prev, bio: e.target.value }))} />
              <div className="char-count">{draftProfile.bio.length} / 150</div>
              <label className="section-label">Phone Number</label>
              <input type="tel" placeholder="+234 800 000 0000" value={draftProfile.phone}
                onChange={e => setDraftProfile(prev => ({ ...prev, phone: e.target.value }))} />
              <label className="section-label">Email</label>
              <input type="email" placeholder="you@email.com" value={draftProfile.email}
                onChange={e => setDraftProfile(prev => ({ ...prev, email: e.target.value }))} />
              <button className="btn-blue gap-v" onClick={saveProfile}>Save Profile</button>
              <button className="btn-white gap-v" onClick={closeChatModal}>Cancel</button>
            </>
          )}

          {/* CREATE GROUP MODAL */}
          {chatModal === "create-group" && (
            <>
              <div className="modal-header">
                <h3>Create Group Chat</h3>
                <button className="modal-close" onClick={closeChatModal}>×</button>
              </div>

              {draftGroup.img && (
                <div className="profile-pic-preview" style={{ backgroundImage: `url(${draftGroup.img})` }} />
              )}

              <label className="section-label">Group Name *</label>
              <input type="text" placeholder="e.g. JSS 2A Science Class" value={draftGroup.name}
                onChange={e => setDraftGroup(prev => ({ ...prev, name: e.target.value }))} />

              <label className="section-label">Description</label>
              <textarea placeholder="What is this group about?" maxLength={150} value={draftGroup.description}
                onChange={e => setDraftGroup(prev => ({ ...prev, description: e.target.value }))} />
              <div className="char-count">{draftGroup.description.length} / 150</div>

              <label className="section-label">Group Icon</label>
              <input type="file" ref={groupPicInputRef} hidden accept="image/*" onChange={handleGroupPic} />
              <button className="btn-white" onClick={() => groupPicInputRef.current?.click()}>
                {draftGroup.img ? "Change Icon" : "Choose Icon (Optional)"}
              </button>

              <div className="member-count-row">
                <span>Add Members</span>
                <span className="member-count-badge">{draftGroup.memberIds.length} / {MAX_GROUP_MEMBERS}</span>
              </div>

              <button className="btn-phone-import" onClick={importFromPhone}>
                📱 Import from Phone Contacts
              </button>

              <label className="section-label">App Contacts</label>
              {APP_CONTACTS.map(c => (
                <div key={c.id} className="member-select-item">
                  <input type="checkbox" className="member-checkbox"
                    checked={draftGroup.memberIds.includes(c.id)}
                    onChange={() => toggleGroupMember(c.id)} />
                  <img src={c.img} className="avatar-sm" alt={c.name} />
                  <span className="member-name">{c.name}</span>
                </div>
              ))}

              <button className="btn-green gap-v" onClick={createGroup}>Create Group</button>
              <button className="btn-white gap-v" onClick={closeChatModal}>Cancel</button>
            </>
          )}

          {/* EDIT GROUP MODAL */}
          {chatModal === "edit-group" && editGroupId === null && (
            <>
              <div className="modal-header">
                <h3>Edit Group Chat</h3>
                <button className="modal-close" onClick={closeChatModal}>×</button>
              </div>
              {groups.length === 0 ? (
                <p style={{ color: "var(--grey)", textAlign: "center", padding: "20px 0" }}>
                  No groups yet. Create one first!
                </p>
              ) : (
                groups.map(g => (
                  <div key={g.id} className="group-list-item" onClick={() => startEditGroup(g)}>
                    <div className="group-avatar-circle"
                      style={g.img ? { backgroundImage: `url(${g.img})` } : {}}>
                      {!g.img && g.name[0]?.toUpperCase()}
                    </div>
                    <div className="group-list-info">
                      <h4>{g.name}</h4>
                      <p>{g.memberIds.length} member{g.memberIds.length !== 1 ? "s" : ""}{g.description ? ` · ${g.description.slice(0, 40)}...` : ""}</p>
                    </div>
                  </div>
                ))
              )}
              <button className="btn-white gap-v" onClick={closeChatModal}>Close</button>
            </>
          )}

          {chatModal === "edit-group" && editGroupId !== null && (
            <>
              <div className="modal-header">
                <h3>Edit Group</h3>
                <button className="modal-close" onClick={() => setEditGroupId(null)}>←</button>
              </div>

              {draftGroup.img && (
                <div className="profile-pic-preview" style={{ backgroundImage: `url(${draftGroup.img})` }} />
              )}

              <label className="section-label">Group Name *</label>
              <input type="text" value={draftGroup.name}
                onChange={e => setDraftGroup(prev => ({ ...prev, name: e.target.value }))} />

              <label className="section-label">Description</label>
              <textarea maxLength={150} value={draftGroup.description}
                onChange={e => setDraftGroup(prev => ({ ...prev, description: e.target.value }))} />
              <div className="char-count">{draftGroup.description.length} / 150</div>

              <label className="section-label">Group Icon</label>
              <input type="file" ref={groupPicInputRef} hidden accept="image/*" onChange={handleGroupPic} />
              <button className="btn-white" onClick={() => groupPicInputRef.current?.click()}>
                {draftGroup.img ? "Change Icon" : "Choose Icon"}
              </button>

              <div className="member-count-row">
                <span>Members</span>
                <span className="member-count-badge">{draftGroup.memberIds.length} / {MAX_GROUP_MEMBERS}</span>
              </div>
              {APP_CONTACTS.map(c => (
                <div key={c.id} className="member-select-item">
                  <input type="checkbox" className="member-checkbox"
                    checked={draftGroup.memberIds.includes(c.id)}
                    onChange={() => toggleGroupMember(c.id)} />
                  <img src={c.img} className="avatar-sm" alt={c.name} />
                  <span className="member-name">{c.name}</span>
                </div>
              ))}

              <button className="btn-green gap-v" onClick={saveGroup}>Save Changes</button>
              <button className="btn-grey gap-v" onClick={() => { if (window.confirm("Delete this group?")) deleteGroup(editGroupId!); }}>
                Delete Group
              </button>
              <button className="btn-white gap-v" onClick={() => setEditGroupId(null)}>Back</button>
            </>
          )}

        </div>
      </div>
    );
  }

  // ====================== SCREENS ======================

  if (screen === "onboarding") return (
    <>
      <div className="screen"><div className="container">
        <h1>Zapphub</h1>
        <p>Educational resources for secondary school students.</p>
        <button className="btn-blue" onClick={() => goTo("registration")}>Click to Get Started</button>
      </div></div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );

  if (screen === "registration") return (
    <>
      <div className="screen"><div className="container">
        <h2>Create Account</h2>
        <input type="text" placeholder="Full Name" value={regName} onChange={e => setRegName(e.target.value)} />
        <input type="email" placeholder="Email" value={regEmail} onChange={e => setRegEmail(e.target.value)} />
        <input type="password" placeholder="Password" value={regPass} onChange={e => setRegPass(e.target.value)} />
        <button className="btn-blue" onClick={() => {
          if (regEmail) setUserEmail(regEmail);
          // Auto-create chat profile from registration
          const newProfile: ChatProfile = { name: regName, bio: "", phone: "", email: regEmail, img: "" };
          setChatProfile(newProfile);
          localStorage.setItem("zapphub_chat_profile", JSON.stringify(newProfile));
          goTo("login");
        }}>Register</button>
        <p onClick={() => goTo("login")} style={{ cursor: "pointer", color: "#3498db", marginTop: 15 }}>
          Already have an account? Login
        </p>
      </div></div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );

  if (screen === "login") return (
    <>
      <div className="screen"><div className="container">
        <h2>Login to Zapphub</h2>
        <input type="text" placeholder="Email or Username" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
        <input type="password" placeholder="Password" value={loginPass} onChange={e => setLoginPass(e.target.value)} />
        <button className="btn-blue" onClick={() => {
          if (loginEmail) setUserEmail(loginEmail);
          // Sync email into chat profile if not already set
          setChatProfile(prev => ({ ...prev, email: prev.email || loginEmail }));
          goTo("user-dashboard");
        }}>Login</button>
      </div></div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );

  if (screen === "user-dashboard") return (
    <>
      <div className="screen">
        <div className="dashboard-header">
          <div className="profile-group">
            <div className="profile-circle" onClick={() => profileInputRef.current?.click()}
              style={profileImg ? { backgroundImage: `url(${profileImg})` } : {}} />
            <input type="file" ref={profileInputRef} hidden accept="image/*" onChange={handleProfilePic} />
            <span className="display-email">{userEmail}</span>
          </div>
          <div className="theme-toggle-container">
            Dark Mode
            <label className="switch">
              <input type="checkbox" checked={theme === "dark"} onChange={e => setTheme(e.target.checked ? "dark" : "light")} />
              <span className="slider round" />
            </label>
          </div>
        </div>
        <div className="chat-gateway-card" onClick={() => { setChatView("landing"); goTo("chat-app"); }}>
          <h2>Zapphub Chat</h2>
        </div>
        <div className="learn-now-card" onClick={() => goTo("portal-selection")}>
          <h2>Learn Now</h2>
        </div>
      </div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );

  if (screen === "chat-app") {
    const allChatsAndGroups = [...activeChats];
    const currentGroupMsgs = activeGroup ? (groupMessages[activeGroup.id] || []) : [];

    return (
      <>
        <div className="chat-screen">

          {/* LANDING */}
          <div className={`chat-view ${chatView === "landing" ? "active" : ""}`}>
            <div className="container" style={{ marginTop: 80 }}>
              <h1 style={{ color: "var(--wa-teal)" }}>zapphub chat</h1>
              {chatProfile.name && <p style={{ fontWeight: 600, color: "var(--navy)" }}>Welcome, {chatProfile.name}!</p>}
              <p>Connect with friends and family instantly.</p>
              <button style={{ background: "var(--wa-teal)", color: "white" }} onClick={() => setChatView("dashboard")}>Join Chat</button>
              <button className="btn-grey gap-v" onClick={() => goTo("user-dashboard")}>Back to Zapphub</button>
            </div>
          </div>

          {/* DASHBOARD */}
          <div className={`chat-view ${chatView === "dashboard" ? "active" : ""}`}>
            <header className="app-header-chat">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button className="btn-chat-nav" onClick={() => setChatView("landing")}>←</button>
                <h2>Chats</h2>
              </div>
              <div className="chat-header-right" ref={menuRef}>
                <button className="btn-chat-nav" onClick={() => setChatView("contacts")}>New ➔</button>
                {/* Profile avatar button */}
                <div
                  className="chat-avatar-btn"
                  onClick={() => setChatMenuOpen(prev => !prev)}
                  style={chatProfile.img ? { backgroundImage: `url(${chatProfile.img})` } : {}}
                >
                  {!chatProfile.img && (chatProfile.name?.[0]?.toUpperCase() || "?")}
                </div>
                {chatMenuOpen && (
                  <div className="chat-dropdown">
                    <div className="chat-dropdown-item" onClick={() => openChatModal("view-profile")}>
                      <span className="dropdown-icon">👤</span> View Profile
                    </div>
                    <div className="chat-dropdown-item" onClick={() => openChatModal("profile-pic")}>
                      <span className="dropdown-icon">📷</span> Profile Picture
                    </div>
                    <div className="chat-dropdown-item" onClick={() => openChatModal("edit-profile")}>
                      <span className="dropdown-icon">✏️</span> Edit Profile
                    </div>
                    <div className="chat-dropdown-item" onClick={() => openChatModal("create-group")}>
                      <span className="dropdown-icon">👥</span> Create Group Chat
                    </div>
                    <div className="chat-dropdown-item" onClick={() => openChatModal("edit-group")}>
                      <span className="dropdown-icon">🔧</span> Edit Group Chat
                    </div>
                  </div>
                )}
              </div>
            </header>
            {/* COLOUR PALETTE STRIP — top-left of dashboard */}
            <div className="palette-strip">
              <span className="palette-strip-label">Colour</span>
              {PALETTE_COLORS.map(c => (
                <div
                  key={c.value}
                  className={`palette-swatch${chatBubbleColor === c.value ? " selected" : ""}`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                  onClick={() => {
                    setChatBubbleColor(c.value);
                    localStorage.setItem("zapphub_bubble_color", c.value);
                  }}
                />
              ))}
            </div>

            <div className="list-container">
              {allChatsAndGroups.length === 0 && groups.length === 0 ? (
                <p className="empty-msg">No chats yet. Tap New ➔ to start!</p>
              ) : (
                <>
                  {allChatsAndGroups.map(c => (
                    <div key={`c-${c.id}`} className="item-row" onClick={() => startChat(c)}>
                      <img src={c.img} className="avatar-sm" alt={c.name} />
                      <div className="item-info"><h4>{c.name}</h4><p>Tap to chat</p></div>
                    </div>
                  ))}
                  {groups.map(g => (
                    <div key={`g-${g.id}`} className="item-row" onClick={() => openGroupRoom(g)}>
                      <div className="group-avatar-circle" style={g.img ? { backgroundImage: `url(${g.img})` } : {}}>
                        {!g.img && g.name[0]?.toUpperCase()}
                      </div>
                      <div className="item-info">
                        <h4>{g.name}</h4>
                        <p>{g.memberIds.length} members</p>
                      </div>
                      <span className="item-badge">Group</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* CONTACTS */}
          <div className={`chat-view ${chatView === "contacts" ? "active" : ""}`}>
            <header className="app-header-chat">
              <button className="btn-chat-nav" onClick={() => setChatView("dashboard")}>← Back</button>
              <h2>Contacts</h2>
              <div />
            </header>
            <div className="list-container">
              {APP_CONTACTS.map(c => (
                <div key={c.id} className="item-row" onClick={() => startChat(c)}>
                  <img src={c.img} className="avatar-sm" alt={c.name} />
                  <div className="item-info"><h4>{c.name}</h4></div>
                </div>
              ))}
            </div>
          </div>

          {/* 1-ON-1 ROOM */}
          <div className={`chat-view ${chatView === "room" ? "active" : ""}`}>
            <header className="app-header-chat">
              <button className="btn-chat-nav" onClick={() => setChatView("dashboard")}>←</button>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, marginLeft: 10 }}>
                {activeContact && <img src={activeContact.img} className="avatar-sm" alt={activeContact.name} />}
                <span>{activeContact?.name}</span>
              </div>
            </header>
            <div className="message-container">
              {messages.map((m, i) => (
                <div key={i} className={`bubble ${m.sent ? "sent" : "received"}`}
                  style={m.sent ? { backgroundColor: chatBubbleColor } : {}}>
                  {m.text}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="input-panel">
              <input type="text" placeholder="Type a message" value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()} />
              <button className="send-btn" onClick={sendMessage}>➤</button>
            </div>
          </div>

          {/* GROUP ROOM */}
          <div className={`chat-view ${chatView === "group-room" ? "active" : ""}`}>
            <header className="app-header-chat">
              <button className="btn-chat-nav" onClick={() => setChatView("dashboard")}>←</button>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, marginLeft: 10 }}>
                <div className="group-avatar-circle" style={{ width: 36, height: 36, fontSize: 14, ...(activeGroup?.img ? { backgroundImage: `url(${activeGroup.img})` } : {}) }}>
                  {!activeGroup?.img && activeGroup?.name[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{activeGroup?.name}</div>
                  <div style={{ fontSize: 11, opacity: 0.8 }}>{activeGroup?.memberIds.length} members</div>
                </div>
              </div>
            </header>
            <div className="message-container">
              {currentGroupMsgs.map((m, i) => (
                <div key={i} className={`bubble ${m.sent ? "sent" : "received"}`}
                  style={m.sent ? { backgroundColor: chatBubbleColor } : {}}>
                  {m.text}
                </div>
              ))}
              {currentGroupMsgs.length === 0 && <p className="empty-msg" style={{ color: "#888" }}>No messages yet</p>}
              <div ref={messagesEndRef} />
            </div>
            <div className="input-panel">
              <input type="text" placeholder="Message group..." value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendGroupMessage()} />
              <button className="send-btn" onClick={sendGroupMessage}>➤</button>
            </div>
          </div>

        </div>

        {/* MODALS */}
        {renderChatModal()}
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  if (screen === "portal-selection") return (
    <>
      <div className="screen">
        <div className="portal-grid">
          <div className="portal-white-card" onClick={() => goTo("admin-gate")}>Admin Portal</div>
          <div className="portal-white-card" onClick={() => goTo("student-portal")}>Student Portal</div>
          <div className="portal-white-card" onClick={() => goTo("teacher-portal")}>Teachers Portal</div>
        </div>
        <button className="btn-grey" onClick={() => goTo("user-dashboard")}>Back to Home</button>
      </div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );

  if (screen === "admin-gate") return (
    <>
      <div className="screen"><div className="container">
        <h3>Admin Verification</h3>
        <input type="text" placeholder="Enter Admin Username" value={adminUser} onChange={e => setAdminUser(e.target.value)} />
        <input type="password" placeholder="Password" value={adminPass} onChange={e => setAdminPass(e.target.value)} onKeyDown={e => e.key === "Enter" && verifyAdmin()} />
        <button className="btn-blue" onClick={verifyAdmin}>Unlock Portal</button>
        <button className="btn-grey gap-v" onClick={() => goTo("portal-selection")}>Cancel</button>
      </div></div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );

  if (screen === "admin-dashboard") {
    const termLabels = ["First Term", "Second Term", "Third Term"];
    const lessonsByTerm = (n: number) => db.filter(i => i.class === activeClass && i.term === n);
    return (
      <>
        <div className="screen">
          <h2 className="screen-title">Admin Management</h2>
          <div className="admin-nav-bar">
            <button className="btn-nav" onClick={adminBackward}>← Backward</button>
            <button className="btn-nav" onClick={adminForward}>Forward →</button>
          </div>
          {adminView === "main" && (
            <div className="main-portal-btns">
              <button className="btn-white" onClick={() => showSection("Primary")}>Primary</button>
              <button className="btn-white" onClick={() => showSection("JSS")}>Junior Secondary</button>
              <button className="btn-white" onClick={() => showSection("SSS")}>Senior Secondary</button>
            </div>
          )}
          {adminView === "classes" && (
            <div>
              <h3 style={{ marginBottom: 12, color: "var(--main-text)" }}>{activeSection} SECTIONS</h3>
              <div className="class-btns-grid">{classOptions(activeSection).map(c => <button key={c} onClick={() => selectClass(c)}>{c}</button>)}</div>
              <button className="btn-grey gap-v" onClick={() => setAdminView("main")}>Back to Categories</button>
            </div>
          )}
          {adminView === "terms" && (
            <div>
              <h3 style={{ marginBottom: 12, color: "var(--main-text)" }}>Lessons for {activeClass}</h3>
              {[1, 2, 3].map(n => (
                <div key={n} className="term-container">
                  <div className="term-header" onClick={() => toggleTerm(n)}>
                    <span>{termLabels[n - 1]}</span><span>{openTerm === n ? "▲" : "▼"}</span>
                  </div>
                  {openTerm === n && (
                    <div className="term-content">
                      <input type="text" placeholder="Topic Title" value={termTitles[n]} onChange={e => setTermTitles(prev => ({ ...prev, [n]: e.target.value }))} />
                      <input type="file" onChange={e => setTermFiles(prev => ({ ...prev, [n]: e.target.files?.[0] || null }))} />
                      <button className="btn-green gap-v-sm" onClick={() => uploadLesson(n)}>Upload Now</button>
                      <div style={{ marginTop: 10 }}>
                        {lessonsByTerm(n).map(item => (
                          <div key={item.id} className="upload-item">
                            <span>{item.title}</span>
                            <button className="del-btn" onClick={() => deleteItem(item.id)}>Delete</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <button className="btn-grey gap-v" onClick={() => setAdminView("classes")}>Back to Classes</button>
            </div>
          )}
        </div>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  if (screen === "student-portal") {
    const classes = [...new Set(db.map(i => i.class))];
    const showingSearch = searchQuery.trim() !== "";
    const listToShow = selectedStudentClass ? filteredLessons.filter(i => i.class === selectedStudentClass) : filteredLessons;
    return (
      <>
        <div className="screen">
          <h2 className="screen-title">Student Learning Portal</h2>
          <input type="search" placeholder="Search by topic or class..." value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setSelectedStudentClass(null); }} />
          {!showingSearch && !selectedStudentClass && (
            <div className="category-grid">
              {classes.length === 0 && <p style={{ color: "var(--grey)", gridColumn: "1/-1" }}>No lessons uploaded yet.</p>}
              {classes.map(c => (
                <div key={c} className="category-card" onClick={() => setSelectedStudentClass(c)}>
                  <span>{c}</span><span className="sub">{db.filter(i => i.class === c).length} Lessons</span>
                </div>
              ))}
            </div>
          )}
          {(showingSearch || selectedStudentClass) && (
            <div>
              {selectedStudentClass && !showingSearch && <button className="btn-grey" style={{ marginBottom: 12 }} onClick={() => setSelectedStudentClass(null)}>← All Classes</button>}
              {listToShow.length === 0 && <p style={{ color: "var(--grey)", textAlign: "center", marginTop: 20 }}>No lessons found.</p>}
              {listToShow.map(i => (
                <div key={i.id} className="lesson-card">
                  <strong>{i.class} — Term {i.term}</strong><span>{i.title}</span><br />
                  <button className="btn-read" onClick={() => openLesson(i.id)}>Read</button>
                </div>
              ))}
            </div>
          )}
          <button className="btn-grey gap-v" onClick={() => goTo("portal-selection")}>Exit Portal</button>
        </div>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  if (screen === "teacher-portal") {
    const classes = [...new Set(db.map(i => i.class))];
    const showingSearch = teacherSearchQuery.trim() !== "";
    const listToShow = selectedTeacherClass ? filteredTeacherLessons.filter(i => i.class === selectedTeacherClass) : filteredTeacherLessons;
    return (
      <>
        <div className="screen">
          <h2 className="screen-title">Teachers Learning Portal</h2>
          <input type="search" placeholder="Search by topic or class..." value={teacherSearchQuery}
            onChange={e => { setTeacherSearchQuery(e.target.value); setSelectedTeacherClass(null); }} />
          {!showingSearch && !selectedTeacherClass && (
            <div className="category-grid">
              {classes.length === 0 && <p style={{ color: "var(--grey)", gridColumn: "1/-1" }}>No lessons uploaded yet.</p>}
              {classes.map(c => (
                <div key={c} className="category-card" onClick={() => setSelectedTeacherClass(c)}>
                  <span>{c}</span><span className="sub">{db.filter(i => i.class === c).length} Lessons</span>
                </div>
              ))}
            </div>
          )}
          {(showingSearch || selectedTeacherClass) && (
            <div>
              {selectedTeacherClass && !showingSearch && <button className="btn-grey" style={{ marginBottom: 12 }} onClick={() => setSelectedTeacherClass(null)}>← All Classes</button>}
              {listToShow.length === 0 && <p style={{ color: "var(--grey)", textAlign: "center", marginTop: 20 }}>No lessons found.</p>}
              {listToShow.map(i => (
                <div key={i.id} className="lesson-card">
                  <strong>{i.class} — Term {i.term}</strong><span>{i.title}</span><br />
                  <button className="btn-read" onClick={() => openTeacherLesson(i.id)}>Read</button>
                </div>
              ))}
            </div>
          )}
          <button className="btn-grey gap-v" onClick={() => goTo("portal-selection")}>Exit Portal</button>
        </div>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  if ((screen === "lesson-viewer" || screen === "teacher-lesson-viewer") && viewLesson) return (
    <>
      <div className="screen"><div className="container">
        <h2>{viewLesson.title}</h2>
        <p>{viewLesson.class} &mdash; Term {viewLesson.term}</p>
        <div className="reading-pane">
          <p><strong>File:</strong> {viewLesson.fileName}</p>
          <hr style={{ border: 0, borderTop: "1px solid var(--reading-pane-border)", margin: "15px 0" }} />
          <p>Educational content appears here. The full document viewer would load the uploaded file.</p>
        </div>
        <button className="btn-blue" style={{ marginTop: 20 }} onClick={() => goTo(lessonReturnScreen)}>Back to Portal</button>
      </div></div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );

  return null;
}
