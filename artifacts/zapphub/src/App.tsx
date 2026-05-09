import { useState, useEffect, useRef, useCallback } from "react";

// ---- TYPES ----
type Screen =
  | "onboarding"
  | "registration"
  | "login"
  | "user-dashboard"
  | "chat-app"
  | "portal-selection"
  | "admin-gate"
  | "admin-dashboard"
  | "student-portal"
  | "lesson-viewer";

type ChatView = "landing" | "dashboard" | "contacts" | "room";

interface Lesson {
  id: number;
  section: string;
  class: string;
  term: number;
  title: string;
  fileName: string;
}

interface Contact {
  id: number;
  name: string;
  img: string;
}

interface Message {
  text: string;
  sent: boolean;
}

const ADMIN_CREDS = { user: "Samuel Chibuike Azubuike", pass: "Lordmayor" };

const CONTACTS: Contact[] = [
  { id: 1, name: "Sarah", img: "https://i.pravatar.cc/150?u=1" },
  { id: 2, name: "John Doe", img: "https://i.pravatar.cc/150?u=2" },
  { id: 3, name: "Toolifylab Team", img: "https://i.pravatar.cc/150?u=3" },
];

// ---- TOAST ----
interface ToastItem { id: number; message: string; }

function ToastContainer({ toasts, onRemove }: { toasts: ToastItem[]; onRemove: (id: number) => void }) {
  useEffect(() => {
    toasts.forEach(t => {
      const timer = setTimeout(() => onRemove(t.id), 3000);
      return () => clearTimeout(timer);
    });
  }, [toasts, onRemove]);

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className="toast">{t.message}</div>
      ))}
    </div>
  );
}

// ---- MAIN APP ----
export default function App() {
  const [screen, setScreen] = useState<Screen>("onboarding");
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    (localStorage.getItem("zapphub_theme") as "light" | "dark") || "light"
  );
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [userEmail, setUserEmail] = useState("chachachandca@gmail.com");
  const [profileImg, setProfileImg] = useState<string>(
    localStorage.getItem("zapphub_user_image") || ""
  );

  // DB
  const [db, setDb] = useState<Lesson[]>(() =>
    JSON.parse(localStorage.getItem("zapphub_db") || "[]")
  );

  // Chat state
  const [chatView, setChatView] = useState<ChatView>("landing");
  const [activeChats, setActiveChats] = useState<Contact[]>([]);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");

  // Admin state
  const [adminView, setAdminView] = useState<"main" | "classes" | "terms">("main");
  const [activeSection, setActiveSection] = useState("");
  const [activeClass, setActiveClass] = useState("");
  const [openTerm, setOpenTerm] = useState<number | null>(null);
  const [termTitles, setTermTitles] = useState<{ [k: number]: string }>({ 1: "", 2: "", 3: "" });
  const [termFiles, setTermFiles] = useState<{ [k: number]: File | null }>({ 1: null, 2: null, 3: null });

  // Student portal
  const [selectedStudentClass, setSelectedStudentClass] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Lesson viewer
  const [viewLesson, setViewLesson] = useState<Lesson | null>(null);

  // Admin gate
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");

  // Registration
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");

  // Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");

  const profileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync theme to DOM
  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("zapphub_theme", theme);
  }, [theme]);

  // Sync db to localStorage
  useEffect(() => {
    localStorage.setItem("zapphub_db", JSON.stringify(db));
  }, [db]);

  // Auto scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const showToast = useCallback((msg: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message: msg }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const goTo = useCallback((s: Screen) => {
    if (s === "student-portal") {
      setSelectedStudentClass(null);
      setSearchQuery("");
    }
    if (s === "admin-dashboard") {
      setAdminView("main");
    }
    setScreen(s);
  }, []);

  // --- PROFILE ---
  function handleProfilePic(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setProfileImg(result);
      localStorage.setItem("zapphub_user_image", result);
    };
    reader.readAsDataURL(file);
  }

  // --- CHAT ---
  function startChat(contact: Contact) {
    if (!activeChats.find(c => c.id === contact.id)) {
      setActiveChats(prev => [...prev, contact]);
    }
    setActiveContact(contact);
    setMessages([]);
    setChatView("room");
  }

  function sendMessage() {
    if (!chatInput.trim()) return;
    setMessages(prev => [...prev, { text: chatInput.trim(), sent: true }]);
    setChatInput("");
  }

  // --- ADMIN ---
  function verifyAdmin() {
    if (adminUser.trim() === ADMIN_CREDS.user && adminPass === ADMIN_CREDS.pass) {
      goTo("admin-dashboard");
      setAdminUser("");
      setAdminPass("");
    } else {
      showToast("Unauthorized Access");
    }
  }

  function showSection(type: string) {
    setActiveSection(type);
    setAdminView("classes");
  }

  function selectClass(c: string) {
    setActiveClass(c);
    setAdminView("terms");
    setOpenTerm(null);
    setTermTitles({ 1: "", 2: "", 3: "" });
    setTermFiles({ 1: null, 2: null, 3: null });
  }

  function uploadLesson(n: number) {
    const title = termTitles[n];
    const file = termFiles[n];
    if (!title || !file) { showToast("Fill all fields"); return; }
    const lesson: Lesson = {
      id: Date.now(),
      section: activeSection,
      class: activeClass,
      term: n,
      title,
      fileName: file.name,
    };
    setDb(prev => [...prev, lesson]);
    setTermTitles(prev => ({ ...prev, [n]: "" }));
    setTermFiles(prev => ({ ...prev, [n]: null }));
    showToast("Lesson uploaded!");
  }

  function deleteItem(id: number) {
    setDb(prev => prev.filter(i => i.id !== id));
  }

  function adminBackward() {
    if (adminView === "terms") setAdminView("classes");
    else if (adminView === "classes") setAdminView("main");
    else goTo("portal-selection");
  }

  function adminForward() {
    if (adminView === "main") showToast("Select a section first");
    else if (adminView === "classes") showToast("Select a class first");
    else showToast("You are in the deepest level");
  }

  function toggleTerm(n: number) {
    setOpenTerm(prev => (prev === n ? null : n));
  }

  // --- STUDENT PORTAL ---
  const filteredLessons = db.filter(
    i =>
      i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.class.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function openLesson(id: number) {
    const lesson = db.find(i => i.id === id);
    if (!lesson) return;
    setViewLesson(lesson);
    goTo("lesson-viewer");
  }

  const classOptions = (type: string) =>
    type === "Primary"
      ? ["Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6"]
      : type === "JSS"
      ? ["JSS 1", "JSS 2", "JSS 3"]
      : ["SSS 1", "SSS 2", "SSS 3"];

  // ====================== SCREENS ======================

  if (screen === "onboarding") {
    return (
      <>
        <div className="screen">
          <div className="container">
            <h1>Zapphub</h1>
            <p>Educational resources for secondary school students.</p>
            <button className="btn-blue" onClick={() => goTo("registration")}>
              Click to Get Started
            </button>
          </div>
        </div>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  if (screen === "registration") {
    return (
      <>
        <div className="screen">
          <div className="container">
            <h2>Create Account</h2>
            <input
              type="text"
              placeholder="Full Name"
              value={regName}
              onChange={e => setRegName(e.target.value)}
            />
            <input
              type="email"
              placeholder="Email"
              value={regEmail}
              onChange={e => setRegEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              value={regPass}
              onChange={e => setRegPass(e.target.value)}
            />
            <button
              className="btn-blue"
              onClick={() => {
                if (regEmail) setUserEmail(regEmail);
                goTo("login");
              }}
            >
              Register
            </button>
            <p
              onClick={() => goTo("login")}
              style={{ cursor: "pointer", color: "#3498db", marginTop: 15 }}
            >
              Already have an account? Login
            </p>
          </div>
        </div>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  if (screen === "login") {
    return (
      <>
        <div className="screen">
          <div className="container">
            <h2>Login to Zapphub</h2>
            <input
              type="text"
              placeholder="Email or Username"
              value={loginEmail}
              onChange={e => setLoginEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              value={loginPass}
              onChange={e => setLoginPass(e.target.value)}
            />
            <button
              className="btn-blue"
              onClick={() => {
                if (loginEmail) setUserEmail(loginEmail);
                goTo("user-dashboard");
              }}
            >
              Login
            </button>
          </div>
        </div>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  if (screen === "user-dashboard") {
    return (
      <>
        <div className="screen">
          <div className="dashboard-header">
            <div className="profile-group">
              <div
                className="profile-circle"
                onClick={() => profileInputRef.current?.click()}
                style={profileImg ? { backgroundImage: `url(${profileImg})` } : {}}
              />
              <input
                type="file"
                ref={profileInputRef}
                hidden
                accept="image/*"
                onChange={handleProfilePic}
              />
              <span className="display-email">{userEmail}</span>
            </div>
            <div className="theme-toggle-container">
              Dark Mode
              <label className="switch">
                <input
                  type="checkbox"
                  checked={theme === "dark"}
                  onChange={e => setTheme(e.target.checked ? "dark" : "light")}
                />
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
  }

  if (screen === "chat-app") {
    return (
      <>
        <div className="chat-screen">
          {/* LANDING */}
          <div className={`chat-view ${chatView === "landing" ? "active" : ""}`}>
            <div className="container" style={{ marginTop: 80 }}>
              <h1 style={{ color: "var(--wa-teal)" }}>zapphub chat</h1>
              <p>Connect with friends and family instantly.</p>
              <button
                style={{ background: "var(--wa-teal)", color: "white" }}
                onClick={() => setChatView("dashboard")}
              >
                Join Chat
              </button>
              <button
                className="btn-grey gap-v"
                onClick={() => goTo("user-dashboard")}
              >
                Back to Zapphub
              </button>
            </div>
          </div>

          {/* DASHBOARD */}
          <div className={`chat-view ${chatView === "dashboard" ? "active" : ""}`}>
            <header className="app-header-chat">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button className="btn-chat-nav" onClick={() => setChatView("landing")}>←</button>
                <h2>Chats</h2>
              </div>
              <button className="btn-chat-nav" onClick={() => setChatView("contacts")}>Contacts ➔</button>
            </header>
            <div className="list-container">
              {activeChats.length === 0 ? (
                <p className="empty-msg">No active chats. Start one!</p>
              ) : (
                activeChats.map(c => (
                  <div key={c.id} className="item-row" onClick={() => startChat(c)}>
                    <img src={c.img} className="avatar-sm" alt={c.name} />
                    <div className="item-info">
                      <h4>{c.name}</h4>
                      <p>Tap to chat</p>
                    </div>
                  </div>
                ))
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
              {CONTACTS.map(c => (
                <div key={c.id} className="item-row" onClick={() => startChat(c)}>
                  <img src={c.img} className="avatar-sm" alt={c.name} />
                  <div className="item-info"><h4>{c.name}</h4></div>
                </div>
              ))}
            </div>
          </div>

          {/* ROOM */}
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
                <div key={i} className={`bubble ${m.sent ? "sent" : "received"}`}>{m.text}</div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="input-panel">
              <input
                type="text"
                placeholder="Type a message"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
              />
              <button className="send-btn" onClick={sendMessage}>➤</button>
            </div>
          </div>
        </div>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  if (screen === "portal-selection") {
    return (
      <>
        <div className="screen">
          <div className="portal-grid">
            <div className="portal-white-card" onClick={() => goTo("admin-gate")}>
              Admin Portal
            </div>
            <div className="portal-white-card" onClick={() => goTo("student-portal")}>
              Student Portal
            </div>
          </div>
          <button className="btn-grey" onClick={() => goTo("user-dashboard")}>
            Back to Home
          </button>
        </div>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  if (screen === "admin-gate") {
    return (
      <>
        <div className="screen">
          <div className="container">
            <h3>Admin Verification</h3>
            <input
              type="text"
              placeholder="Enter Admin Username"
              value={adminUser}
              onChange={e => setAdminUser(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              value={adminPass}
              onChange={e => setAdminPass(e.target.value)}
              onKeyDown={e => e.key === "Enter" && verifyAdmin()}
            />
            <button className="btn-blue" onClick={verifyAdmin}>Unlock Portal</button>
            <button className="btn-grey gap-v" onClick={() => goTo("portal-selection")}>Cancel</button>
          </div>
        </div>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

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
              <div className="class-btns-grid">
                {classOptions(activeSection).map(c => (
                  <button key={c} onClick={() => selectClass(c)}>{c}</button>
                ))}
              </div>
              <button className="btn-grey gap-v" onClick={() => setAdminView("main")}>
                Back to Categories
              </button>
            </div>
          )}

          {adminView === "terms" && (
            <div>
              <h3 style={{ marginBottom: 12, color: "var(--main-text)" }}>Lessons for {activeClass}</h3>
              {[1, 2, 3].map(n => (
                <div key={n} className="term-container">
                  <div className="term-header" onClick={() => toggleTerm(n)}>
                    <span>{termLabels[n - 1]}</span>
                    <span>{openTerm === n ? "▲" : "▼"}</span>
                  </div>
                  {openTerm === n && (
                    <div className="term-content">
                      <input
                        type="text"
                        placeholder="Topic Title"
                        value={termTitles[n]}
                        onChange={e => setTermTitles(prev => ({ ...prev, [n]: e.target.value }))}
                      />
                      <input
                        type="file"
                        onChange={e => setTermFiles(prev => ({ ...prev, [n]: e.target.files?.[0] || null }))}
                      />
                      <button className="btn-green gap-v-sm" onClick={() => uploadLesson(n)}>
                        Upload Now
                      </button>
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
              <button className="btn-grey gap-v" onClick={() => setAdminView("classes")}>
                Back to Classes
              </button>
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
    const listToShow = selectedStudentClass
      ? filteredLessons.filter(i => i.class === selectedStudentClass)
      : filteredLessons;

    return (
      <>
        <div className="screen">
          <h2 className="screen-title">Student Learning Portal</h2>
          <input
            type="search"
            placeholder="Search by topic or class..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setSelectedStudentClass(null);
            }}
          />

          {!showingSearch && !selectedStudentClass && (
            <div className="category-grid">
              {classes.length === 0 && (
                <p style={{ color: "var(--grey)", gridColumn: "1/-1" }}>
                  No lessons uploaded yet.
                </p>
              )}
              {classes.map(c => (
                <div key={c} className="category-card" onClick={() => setSelectedStudentClass(c)}>
                  <span>{c}</span>
                  <span className="sub">{db.filter(i => i.class === c).length} Lessons</span>
                </div>
              ))}
            </div>
          )}

          {(showingSearch || selectedStudentClass) && (
            <div>
              {selectedStudentClass && !showingSearch && (
                <button
                  className="btn-grey"
                  style={{ marginBottom: 12 }}
                  onClick={() => setSelectedStudentClass(null)}
                >
                  ← All Classes
                </button>
              )}
              {listToShow.length === 0 && (
                <p style={{ color: "var(--grey)", textAlign: "center", marginTop: 20 }}>
                  No lessons found.
                </p>
              )}
              {listToShow.map(i => (
                <div key={i.id} className="lesson-card">
                  <strong>{i.class} — Term {i.term}</strong>
                  <span>{i.title}</span>
                  <br />
                  <button className="btn-read" onClick={() => openLesson(i.id)}>Read</button>
                </div>
              ))}
            </div>
          )}

          <button className="btn-grey gap-v" onClick={() => goTo("portal-selection")}>
            Exit Portal
          </button>
        </div>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  if (screen === "lesson-viewer" && viewLesson) {
    return (
      <>
        <div className="screen">
          <div className="container">
            <h2>{viewLesson.title}</h2>
            <p>{viewLesson.class} &mdash; Term {viewLesson.term}</p>
            <div className="reading-pane">
              <p><strong>File:</strong> {viewLesson.fileName}</p>
              <hr style={{ border: 0, borderTop: "1px solid var(--reading-pane-border)", margin: "15px 0" }} />
              <p>Educational content appears here. The full document viewer would load the uploaded file.</p>
            </div>
            <button
              className="btn-blue"
              style={{ marginTop: 20 }}
              onClick={() => goTo("student-portal")}
            >
              Back to Portal
            </button>
          </div>
        </div>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  return null;
}
