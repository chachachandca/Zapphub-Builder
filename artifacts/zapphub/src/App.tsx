import { useState, useEffect, useRef, useCallback } from "react";

// ---- TYPES ----
type Screen =
  | "onboarding" | "registration" | "login" | "user-dashboard"
  | "chat-app" | "portal-selection" | "admin-gate" | "admin-dashboard"
  | "student-portal" | "lesson-viewer" | "teacher-portal" | "teacher-lesson-viewer"
  | "watch-and-learn" | "video-player";

type ChatView = "landing" | "dashboard" | "contacts" | "room" | "group-room";
type ChatModal = null | "view-profile" | "profile-pic" | "edit-profile" | "create-group" | "edit-group";

interface Lesson { id: number; section: string; class: string; term: number; title: string; fileName: string; }
interface VideoItem { id: number; title: string; type: "youtube" | "local"; youtubeId?: string; fileName?: string; objectUrl?: string; }
interface AppContact { id: number; name: string; img: string; }
interface Message { text: string; sent: boolean; }
interface ChatProfile { name: string; bio: string; phone: string; email: string; img: string; }
interface Group { id: number; name: string; description: string; img: string; memberIds: number[]; }
interface ZapphubUser { id: number; name: string; email: string; phone: string; img: string; }

function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 52%, 42%)`;
}
function normalizePhone(p: string) { return p.replace(/[\s\-()+]/g, "").slice(-10); }
function stableNumericId(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  return Math.abs(hash) || 1;
}

const ADMIN_CREDS = { user: "Samuel Chibuike Azubuike", pass: "Lordmayor" };
const MAX_GROUP_MEMBERS = 1000;

const PALETTE_ROWS: { label: string; shades: string[] }[] = [
  { label: "Red",     shades: ["#fef2f2","#fecaca","#f87171","#ef4444","#dc2626","#b91c1c","#991b1b","#7f1d1d"] },
  { label: "Rose",    shades: ["#fff1f2","#fecdd3","#fb7185","#f43f5e","#e11d48","#be123c","#9f1239","#881337"] },
  { label: "Pink",    shades: ["#fdf2f8","#fbcfe8","#f472b6","#ec4899","#db2777","#be185d","#9d174d","#831843"] },
  { label: "Fuchsia", shades: ["#fdf4ff","#f5d0fe","#e879f9","#d946ef","#c026d3","#a21caf","#86198f","#701a75"] },
  { label: "Purple",  shades: ["#faf5ff","#e9d5ff","#c084fc","#a855f7","#9333ea","#7e22ce","#6b21a8","#581c87"] },
  { label: "Violet",  shades: ["#f5f3ff","#ddd6fe","#a78bfa","#8b5cf6","#7c3aed","#6d28d9","#5b21b6","#4c1d95"] },
  { label: "Indigo",  shades: ["#eef2ff","#c7d2fe","#818cf8","#6366f1","#4f46e5","#4338ca","#3730a3","#312e81"] },
  { label: "Blue",    shades: ["#eff6ff","#bfdbfe","#60a5fa","#3b82f6","#2563eb","#1d4ed8","#1e40af","#1e3a8a"] },
  { label: "Sky",     shades: ["#f0f9ff","#bae6fd","#38bdf8","#0ea5e9","#0284c7","#0369a1","#075985","#0c4a6e"] },
  { label: "Cyan",    shades: ["#ecfeff","#a5f3fc","#22d3ee","#06b6d4","#0891b2","#0e7490","#155e75","#164e63"] },
  { label: "Teal",    shades: ["#f0fdfa","#99f6e4","#2dd4bf","#14b8a6","#0d9488","#0f766e","#115e59","#134e4a"] },
  { label: "Emerald", shades: ["#ecfdf5","#a7f3d0","#34d399","#10b981","#059669","#047857","#065f46","#064e3b"] },
  { label: "Green",   shades: ["#f0fdf4","#bbf7d0","#4ade80","#22c55e","#16a34a","#15803d","#166534","#14532d"] },
  { label: "Lime",    shades: ["#f7fee7","#d9f99d","#a3e635","#84cc16","#65a30d","#4d7c0f","#3f6212","#365314"] },
  { label: "Yellow",  shades: ["#fefce8","#fef08a","#facc15","#eab308","#ca8a04","#a16207","#854d0e","#713f12"] },
  { label: "Amber",   shades: ["#fffbeb","#fde68a","#fbbf24","#f59e0b","#d97706","#b45309","#92400e","#78350f"] },
  { label: "Orange",  shades: ["#fff7ed","#fed7aa","#fb923c","#f97316","#ea580c","#c2410c","#9a3412","#7c2d12"] },
  { label: "Stone",   shades: ["#fafaf9","#e7e5e4","#a8a29e","#78716c","#57534e","#44403c","#292524","#1c1917"] },
  { label: "Gray",    shades: ["#f9fafb","#e5e7eb","#9ca3af","#6b7280","#4b5563","#374151","#1f2937","#111827"] },
  { label: "Slate",   shades: ["#f8fafc","#e2e8f0","#94a3b8","#64748b","#475569","#334155","#1e293b","#0f172a"] },
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
  const [regPhone, setRegPhone] = useState("");
  const [regPass, setRegPass] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");

  // Zapphub registered users (persisted)
  const [zapphubUsers, setZapphubUsers] = useState<ZapphubUser[]>(() =>
    JSON.parse(localStorage.getItem("zapphub_registered_users") || "[]")
  );

  // Contacts screen
  const [contactSearch, setContactSearch] = useState("");
  const [phonebookMatches, setPhonebookMatches] = useState<ZapphubUser[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);

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

  // Colour palette panel
  const [paletteOpen, setPaletteOpen] = useState(false);
  const paletteRef = useRef<HTMLDivElement>(null);

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

  // Videos (Watch and Learn)
  const [videos, setVideos] = useState<VideoItem[]>(() => JSON.parse(localStorage.getItem("zapphub_videos") || "[]"));
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);
  const [watchUploadTab, setWatchUploadTab] = useState<"youtube" | "local">("youtube");
  const [watchTitle, setWatchTitle] = useState("");
  const [watchYtUrl, setWatchYtUrl] = useState("");
  const [watchLocalFile, setWatchLocalFile] = useState<File | null>(null);
  const videoObjectUrls = useRef<Map<number, string>>(new Map());

  // Admin
  const [adminView, setAdminView] = useState<"main" | "classes" | "terms" | "watch-upload">("main");
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
  useEffect(() => {
    // persist only metadata — objectUrl (blob) cannot survive page reload
    const toStore = videos.map(v => ({ id: v.id, title: v.title, type: v.type, youtubeId: v.youtubeId, fileName: v.fileName }));
    localStorage.setItem("zapphub_videos", JSON.stringify(toStore));
  }, [videos]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, groupMessages]);


  // Open contacts: try device Contact Picker API, fallback to all registered users
  async function openContactsScreen() {
    setContactSearch("");
    setChatView("contacts");
    const others = zapphubUsers.filter(u => normalizePhone(u.phone) !== normalizePhone(chatProfile.phone));
    const nav = navigator as Navigator & { contacts?: { select: (props: string[], opts?: { multiple?: boolean }) => Promise<{ name?: string[]; tel?: string[] }[]> } };
    if (!nav.contacts) {
      setPhonebookMatches(others);
      return;
    }
    setContactsLoading(true);
    try {
      const picked = await nav.contacts.select(["name", "tel"], { multiple: true });
      const pickedNorms = picked.flatMap(c => (c.tel || []).map(normalizePhone));
      const matched = others.filter(u => pickedNorms.includes(normalizePhone(u.phone)));
      setPhonebookMatches(matched);
      if (matched.length === 0) showToast("No Zapphub contacts found in your phonebook");
    } catch {
      setPhonebookMatches(others);
    } finally {
      setContactsLoading(false);
    }
  }

  // Close dropdowns on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setChatMenuOpen(false);
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) setPaletteOpen(false);
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
    if (s === "watch-and-learn") { /* no reset needed */ }
    if (s !== "video-player") setActiveVideo(null);
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
  function adminBackward() {
    if (adminView === "terms") setAdminView("classes");
    else if (adminView === "classes") setAdminView("main");
    else if (adminView === "watch-upload") setAdminView("main");
    else goTo("portal-selection");
  }
  function adminForward() { if (adminView === "main") showToast("Select a section first"); else if (adminView === "classes") showToast("Select a class first"); else showToast("You are at the deepest level"); }

  // ---- VIDEO HELPERS ----
  function extractYouTubeId(url: string): string | null {
    const m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }
  function uploadVideo() {
    if (!watchTitle.trim()) { showToast("Enter a title"); return; }
    if (watchUploadTab === "youtube") {
      const ytId = extractYouTubeId(watchYtUrl.trim());
      if (!ytId) { showToast("Paste a valid YouTube link"); return; }
      const item: VideoItem = { id: Date.now(), title: watchTitle.trim(), type: "youtube", youtubeId: ytId };
      setVideos(prev => [...prev, item]);
      setWatchTitle(""); setWatchYtUrl("");
      showToast("YouTube video added!");
    } else {
      if (!watchLocalFile) { showToast("Select a video file"); return; }
      const id = Date.now();
      const objectUrl = URL.createObjectURL(watchLocalFile);
      videoObjectUrls.current.set(id, objectUrl);
      const item: VideoItem = { id, title: watchTitle.trim(), type: "local", fileName: watchLocalFile.name, objectUrl };
      setVideos(prev => [...prev, item]);
      setWatchTitle(""); setWatchLocalFile(null);
      showToast("Video uploaded!");
    }
  }
  function deleteVideo(id: number) {
    const url = videoObjectUrls.current.get(id);
    if (url) { URL.revokeObjectURL(url); videoObjectUrls.current.delete(id); }
    setVideos(prev => prev.filter(v => v.id !== id));
  }
  function playVideo(v: VideoItem) {
    // for local videos, restore objectUrl from ref if available
    const objectUrl = v.type === "local" ? videoObjectUrls.current.get(v.id) : undefined;
    setActiveVideo({ ...v, objectUrl });
    goTo("video-player");
  }
  function toggleTerm(n: number) { setOpenTerm(prev => prev === n ? null : n); }
  const classOptions = (type: string) => {
    if (type === "Primary") return ["Primary 1","Primary 2","Primary 3","Primary 4","Primary 5","Primary 6"];
    if (type === "JSS") return ["JSS 1","JSS 2","JSS 3"];
    if (type === "SSS") return ["SSS 1","SSS 2","SSS 3"];
    if (type === "Pre-Nursery/Nursery") return ["Pre-Nursery","Nursery 1","Nursery 2","Nursery 3"];
    if (type === "WAEC-JAMB") return ["WAEC","JAMB"];
    return [];
  };

  // ---- STUDENT / TEACHER ----
  const studentDb = db.filter(i => i.section !== "WAEC-JAMB");
  const waecJambDb = db.filter(i => i.section === "WAEC-JAMB");
  const filteredLessons = studentDb.filter(i => {
    const q = searchQuery.toLowerCase();
    return i.title.toLowerCase().includes(q) || i.class.toLowerCase().includes(q) || i.section.toLowerCase().includes(q);
  });
  const filteredTeacherLessons = waecJambDb.filter(i => i.title.toLowerCase().includes(teacherSearchQuery.toLowerCase()) || i.class.toLowerCase().includes(teacherSearchQuery.toLowerCase()));
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
      <div className="screen auth-screen">
        <div className="auth-card">
          <div className="auth-logo-row">
            <div className="auth-logo-icon">Z</div>
            <span className="auth-logo-text">Zapphub</span>
          </div>
          <h2 className="auth-heading">Welcome to Zapphub</h2>
          <p className="auth-sub">Educational resources for secondary school students.</p>
          <button className="btn-blue auth-btn" style={{ marginTop: 24 }} onClick={() => goTo("registration")}>Get Started</button>
          <button className="btn-outline auth-btn" style={{ marginTop: 10 }} onClick={() => goTo("login")}>Log in</button>
        </div>
      </div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );

  if (screen === "registration") return (
    <>
      <div className="screen auth-screen">
        <div className="auth-card">
          <div className="auth-logo-row">
            <div className="auth-logo-icon">Z</div>
            <span className="auth-logo-text">Zapphub</span>
          </div>
          <h2 className="auth-heading">Create Account</h2>
          <p className="auth-sub">Join the educational community</p>

          <div className="auth-field">
            <label>Full Name</label>
            <input type="text" placeholder="e.g. Amaka Okafor" value={regName} onChange={e => setRegName(e.target.value)} />
          </div>
          <div className="auth-field">
            <label>Email Address</label>
            <input type="email" placeholder="you@example.com" value={regEmail} onChange={e => setRegEmail(e.target.value)} />
          </div>
          <div className="auth-field">
            <label>Phone Number</label>
            <input type="tel" placeholder="e.g. 08012345678" value={regPhone} onChange={e => setRegPhone(e.target.value)} />
            <span className="auth-hint">Used to find you on Zapphub Chat</span>
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input type="password" placeholder="Create a strong password" value={regPass} onChange={e => setRegPass(e.target.value)} />
          </div>

          <button className="btn-blue auth-btn" onClick={() => {
            if (!regName.trim() || !regEmail.trim() || !regPhone.trim() || !regPass.trim()) {
              showToast("All fields are required"); return;
            }
            const newUser: ZapphubUser = { id: Date.now(), name: regName.trim(), email: regEmail.trim(), phone: normalizePhone(regPhone), img: "" };
            const updated = [...zapphubUsers.filter(u => u.email !== newUser.email), newUser];
            setZapphubUsers(updated);
            localStorage.setItem("zapphub_registered_users", JSON.stringify(updated));
            const newProfile: ChatProfile = { name: newUser.name, bio: "", phone: newUser.phone, email: newUser.email, img: "" };
            setChatProfile(newProfile);
            localStorage.setItem("zapphub_chat_profile", JSON.stringify(newProfile));
            setUserEmail(newUser.email);
            showToast("Account created! Please log in.");
            goTo("login");
          }}>Create Account</button>

          <p className="auth-switch">Already have an account?{" "}
            <span onClick={() => goTo("login")}>Login</span>
          </p>
        </div>
      </div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );

  if (screen === "login") return (
    <>
      <div className="screen auth-screen">
        <div className="auth-card">
          <div className="auth-logo-row">
            <div className="auth-logo-icon">Z</div>
            <span className="auth-logo-text">Zapphub</span>
          </div>
          <h2 className="auth-heading">Welcome Back</h2>
          <p className="auth-sub">Sign in to continue</p>

          <div className="auth-field">
            <label>Email or Phone Number</label>
            <input type="text" placeholder="Email or phone number" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input type="password" placeholder="Your password" value={loginPass} onChange={e => setLoginPass(e.target.value)} />
          </div>

          <button className="btn-blue auth-btn" onClick={() => {
            const match = zapphubUsers.find(u =>
              u.email === loginEmail.trim() ||
              normalizePhone(u.phone) === normalizePhone(loginEmail)
            );
            if (match) {
              setUserEmail(match.email);
              const restored: ChatProfile = { name: match.name, bio: chatProfile.bio, phone: match.phone, email: match.email, img: match.img || chatProfile.img };
              setChatProfile(restored);
              localStorage.setItem("zapphub_chat_profile", JSON.stringify(restored));
            } else {
              if (loginEmail.trim()) setUserEmail(loginEmail.trim());
              setChatProfile(prev => ({ ...prev, email: prev.email || loginEmail.trim() }));
            }
            goTo("user-dashboard");
          }}>Login</button>

          <p className="auth-switch">New to Zapphub?{" "}
            <span onClick={() => goTo("registration")}>Create Account</span>
          </p>
        </div>
      </div>
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
                <button className="btn-chat-nav" onClick={openContactsScreen}>New ➔</button>
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
            {/* COLOUR PALETTE TRIGGER — top-left of dashboard */}
            <div className="palette-trigger-bar" ref={paletteRef}>
              <button className="palette-trigger-btn" onClick={() => setPaletteOpen(prev => !prev)}>
                <span className="palette-trigger-dot" style={{ backgroundColor: chatBubbleColor }} />
                <span>Chat Colour</span>
                <span className="palette-trigger-hex">{chatBubbleColor.toUpperCase()}</span>
                <span className="palette-trigger-arrow">{paletteOpen ? "▲" : "▼"}</span>
              </button>

              {paletteOpen && (
                <div className="palette-panel">
                  {/* Selected preview */}
                  <div className="palette-selected-row">
                    <div className="palette-selected-dot" style={{ backgroundColor: chatBubbleColor }} />
                    <div className="palette-selected-info">
                      <span className="palette-selected-label">Selected Colour</span>
                      <span className="palette-selected-hex">{chatBubbleColor.toUpperCase()}</span>
                    </div>
                    <button className="palette-copy-btn" onClick={() => {
                      navigator.clipboard?.writeText(chatBubbleColor).then(() => showToast("Hex code copied!"));
                    }}>Copy</button>
                  </div>

                  {/* Full colour grid */}
                  <div className="palette-grid-scroll">
                    {PALETTE_ROWS.map(row => (
                      <div key={row.label} className="palette-row">
                        <span className="palette-row-label">{row.label}</span>
                        <div className="palette-shades">
                          {row.shades.map(hex => (
                            <div
                              key={hex}
                              className={`palette-cell${chatBubbleColor === hex ? " palette-cell-active" : ""}`}
                              style={{ backgroundColor: hex }}
                              title={hex.toUpperCase()}
                              onClick={() => {
                                setChatBubbleColor(hex);
                                localStorage.setItem("zapphub_bubble_color", hex);
                              }}
                            >
                              {chatBubbleColor === hex && <span className="palette-cell-tick">✓</span>}
                              <span className="palette-cell-code">{hex.toUpperCase()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
            <header className="app-header-chat contacts-header">
              <button className="btn-chat-nav contacts-back" onClick={() => setChatView("dashboard")}>← Back</button>
              <h2>Contacts</h2>
              <div />
            </header>
            <div className="contacts-search-bar">
              <input
                type="text"
                className="contacts-search-input"
                placeholder="Search by name or phone…"
                value={contactSearch}
                onChange={e => setContactSearch(e.target.value)}
              />
            </div>
            <div className="list-container">
              {contactsLoading ? (
                <p className="empty-msg" style={{ padding: "32px 16px" }}>Searching contacts…</p>
              ) : (() => {
                const filtered = phonebookMatches.filter(u =>
                  u.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
                  u.phone.includes(contactSearch)
                );
                if (filtered.length === 0) return (
                  <div className="contacts-empty">
                    <div className="contacts-empty-icon">👥</div>
                    <p>No Zapphub contacts found.</p>
                    <span>Invite friends to join Zapphub!</span>
                  </div>
                );
                return filtered.map(u => (
                  <div key={u.id} className="item-row contacts-row"
                    onClick={() => startChat({ id: u.id, name: u.name, img: u.img || "" })}>
                    <div className="contact-initials-avatar" style={{ background: stringToColor(u.name) }}>
                      {u.name[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="item-info">
                      <h4>{u.name}</h4>
                      <p>{u.phone}</p>
                    </div>
                  </div>
                ));
              })()}
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
        </div>
        <div className="portal-white-card" style={{ marginBottom: 12, padding: "22px 10px" }} onClick={() => goTo("teacher-portal")}>WAEC / JAMB</div>
        <div className="portal-white-card wl-portal-card" style={{ marginBottom: 12 }} onClick={() => goTo("watch-and-learn")}>
          <span className="wl-play-icon">▶</span> Watch &amp; Learn
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
              <button className="btn-white" onClick={() => showSection("Pre-Nursery/Nursery")}>Pre-Nursery / Nursery</button>
              <button className="btn-white" onClick={() => showSection("Primary")}>Primary</button>
              <button className="btn-white" onClick={() => showSection("JSS")}>Junior Secondary</button>
              <button className="btn-white" onClick={() => showSection("SSS")}>Senior Secondary</button>
              <button className="btn-white" onClick={() => showSection("WAEC-JAMB")}>WAEC / JAMB Past Questions</button>
              <button className="btn-white watch-upload-btn" onClick={() => setAdminView("watch-upload")}>▶ Watch &amp; Learn Upload</button>
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
          {adminView === "watch-upload" && (
            <div>
              <h3 style={{ marginBottom: 4, color: "var(--main-text)" }}>Watch &amp; Learn Upload</h3>
              <p style={{ fontSize: 13, color: "var(--grey)", marginBottom: 16 }}>Upload videos (3 min – 10 hrs) or paste a YouTube link.</p>

              {/* Source tab */}
              <div className="wl-tabs">
                <button className={`wl-tab${watchUploadTab === "youtube" ? " active" : ""}`} onClick={() => setWatchUploadTab("youtube")}>▶ YouTube Link</button>
                <button className={`wl-tab${watchUploadTab === "local" ? " active" : ""}`} onClick={() => setWatchUploadTab("local")}>📁 Local Video</button>
              </div>

              <input type="text" placeholder="Video Title *" value={watchTitle} onChange={e => setWatchTitle(e.target.value)} style={{ marginBottom: 10 }} />

              {watchUploadTab === "youtube" ? (
                <input type="url" placeholder="Paste YouTube link here…" value={watchYtUrl} onChange={e => setWatchYtUrl(e.target.value)} style={{ marginBottom: 10 }} />
              ) : (
                <div style={{ marginBottom: 10 }}>
                  <input type="file" accept="video/*" onChange={e => setWatchLocalFile(e.target.files?.[0] || null)} />
                  {watchLocalFile && <p style={{ fontSize: 12, color: "var(--grey)", marginTop: 4 }}>Selected: {watchLocalFile.name}</p>}
                </div>
              )}

              <button className="btn-green gap-v-sm" onClick={uploadVideo}>Upload Video</button>

              {/* Existing videos list */}
              <div style={{ marginTop: 20 }}>
                <h4 style={{ color: "var(--main-text)", marginBottom: 10 }}>Uploaded Videos ({videos.length})</h4>
                {videos.length === 0 && <p style={{ color: "var(--grey)", fontSize: 13 }}>No videos yet.</p>}
                {videos.map(v => (
                  <div key={v.id} className="upload-item">
                    <span>{v.type === "youtube" ? "▶ " : "📁 "}{v.title}</span>
                    <button className="del-btn" onClick={() => deleteVideo(v.id)}>Delete</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  if (screen === "student-portal") {
    const SECTION_ORDER = ["Pre-Nursery/Nursery", "Primary", "JSS", "SSS"];
    const SECTION_LABELS: Record<string, string> = {
      "Pre-Nursery/Nursery": "Pre-Nursery / Nursery",
      "Primary": "Primary School",
      "JSS": "Junior Secondary School",
      "SSS": "Senior Secondary School",
    };
    const TERM_LABELS = ["First Term", "Second Term", "Third Term"];
    const showingSearch = searchQuery.trim() !== "";

    // sections that have at least one lesson
    const activeSections = SECTION_ORDER.filter(sec => studentDb.some(i => i.section === sec));
    // classes in a section
    const classesInSection = (sec: string) => [...new Set(studentDb.filter(i => i.section === sec).map(i => i.class))];
    // lessons for selected class, grouped by term
    const lessonsByTerm = (term: number) => studentDb.filter(i => i.class === selectedStudentClass && i.term === term);

    return (
      <>
        <div className="screen">
          <h2 className="screen-title">Student Learning Portal</h2>

          {/* Search bar */}
          <div className="sp-search-wrap">
            <span className="sp-search-icon">🔍</span>
            <input
              type="search"
              className="sp-search-input"
              placeholder="Search subjects, lessons, topics…"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setSelectedStudentClass(null); }}
            />
            {searchQuery && (
              <button className="sp-search-clear" onClick={() => setSearchQuery("")}>✕</button>
            )}
          </div>

          {/* Search results */}
          {showingSearch && (
            <div>
              <p className="sp-result-count">
                {filteredLessons.length === 0 ? "No results found" : `${filteredLessons.length} result${filteredLessons.length !== 1 ? "s" : ""} for "${searchQuery}"`}
              </p>
              {filteredLessons.map(i => (
                <div key={i.id} className="lesson-card">
                  <div className="lc-meta">{SECTION_LABELS[i.section] ?? i.section} › {i.class} › {TERM_LABELS[i.term - 1]}</div>
                  <strong>{i.title}</strong>
                  <button className="btn-read" onClick={() => openLesson(i.id)}>Read</button>
                </div>
              ))}
            </div>
          )}

          {/* Class drill-down: lessons grouped by term */}
          {!showingSearch && selectedStudentClass && (
            <div>
              <button className="sp-back-btn" onClick={() => setSelectedStudentClass(null)}>← Back to Classes</button>
              <h3 className="sp-class-heading">{selectedStudentClass}</h3>
              {[1, 2, 3].map(n => {
                const lessons = lessonsByTerm(n);
                if (lessons.length === 0) return null;
                return (
                  <div key={n} className="sp-term-group">
                    <div className="sp-term-header">{TERM_LABELS[n - 1]}<span className="sp-term-count">{lessons.length}</span></div>
                    {lessons.map(i => (
                      <div key={i.id} className="lesson-card">
                        <strong>{i.title}</strong>
                        <button className="btn-read" onClick={() => openLesson(i.id)}>Read</button>
                      </div>
                    ))}
                  </div>
                );
              })}
              {[1, 2, 3].every(n => lessonsByTerm(n).length === 0) && (
                <p style={{ color: "var(--grey)", textAlign: "center", marginTop: 20 }}>No lessons for this class yet.</p>
              )}
            </div>
          )}

          {/* Browse: sections with class cards */}
          {!showingSearch && !selectedStudentClass && (
            <div>
              {activeSections.length === 0 && (
                <p style={{ color: "var(--grey)", textAlign: "center", marginTop: 30 }}>No lessons uploaded yet.</p>
              )}
              {activeSections.map(sec => (
                <div key={sec} className="sp-section-group">
                  <div className="sp-section-header">
                    <span className="sp-section-dot" />
                    {SECTION_LABELS[sec]}
                  </div>
                  <div className="category-grid">
                    {classesInSection(sec).map(c => (
                      <div key={c} className="category-card" onClick={() => setSelectedStudentClass(c)}>
                        <span>{c}</span>
                        <span className="sub">{studentDb.filter(i => i.class === c).length} lesson{studentDb.filter(i => i.class === c).length !== 1 ? "s" : ""}</span>
                      </div>
                    ))}
                  </div>
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
    const classes = [...new Set(waecJambDb.map(i => i.class))];
    const showingSearch = teacherSearchQuery.trim() !== "";
    const listToShow = selectedTeacherClass ? filteredTeacherLessons.filter(i => i.class === selectedTeacherClass) : filteredTeacherLessons;
    return (
      <>
        <div className="screen">
          <h2 className="screen-title">WAEC / JAMB Past Questions</h2>
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

  if (screen === "watch-and-learn") return (
    <>
      <div className="screen">
        <h2 className="screen-title">Watch &amp; Learn</h2>
        {videos.length === 0 ? (
          <div className="wl-empty">
            <div className="wl-empty-icon">▶</div>
            <p>No videos uploaded yet.</p>
            <p style={{ fontSize: 13 }}>Check back later — admin will add videos soon.</p>
          </div>
        ) : (
          <div className="wl-grid">
            {videos.map(v => (
              <div key={v.id} className="wl-card" onClick={() => playVideo(v)}>
                {v.type === "youtube" && v.youtubeId ? (
                  <div className="wl-thumb" style={{ backgroundImage: `url(https://img.youtube.com/vi/${v.youtubeId}/mqdefault.jpg)` }}>
                    <div className="wl-play-overlay">▶</div>
                  </div>
                ) : (
                  <div className="wl-thumb wl-thumb-local">
                    <div className="wl-play-overlay">📁</div>
                  </div>
                )}
                <div className="wl-card-body">
                  <p className="wl-card-title">{v.title}</p>
                  <span className="wl-card-badge">{v.type === "youtube" ? "YouTube" : "Local"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        <button className="btn-grey gap-v" onClick={() => goTo("portal-selection")}>Exit Portal</button>
      </div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );

  if (screen === "video-player" && activeVideo) return (
    <>
      <div className="screen">
        <button className="sp-back-btn" style={{ marginBottom: 14 }} onClick={() => goTo("watch-and-learn")}>← Back to Videos</button>
        <h3 className="sp-class-heading" style={{ fontSize: 17, marginBottom: 14 }}>{activeVideo.title}</h3>
        {activeVideo.type === "youtube" && activeVideo.youtubeId ? (
          <div className="wl-player-wrap">
            <iframe
              className="wl-youtube-frame"
              src={`https://www.youtube.com/embed/${activeVideo.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
              title={activeVideo.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        ) : activeVideo.objectUrl ? (
          <div className="wl-player-wrap">
            <video className="wl-local-video" src={activeVideo.objectUrl} controls autoPlay />
          </div>
        ) : (
          <div className="wl-session-expired">
            <p>⚠️ This local video is only available in the session it was uploaded.</p>
            <p style={{ marginTop: 8, fontSize: 13 }}>Please ask the admin to re-upload it, or use a YouTube link for permanent access.</p>
          </div>
        )}
        <button className="btn-grey gap-v" style={{ marginTop: 20 }} onClick={() => goTo("watch-and-learn")}>Back to Watch &amp; Learn</button>
      </div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );

  return null;
}
