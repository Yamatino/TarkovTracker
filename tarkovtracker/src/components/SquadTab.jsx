import React, { useState } from 'react';
import { auth, googleProvider, db } from '../firebaseConfig';
import {
    signInWithPopup,
    signOut,
    updateProfile,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Mail, Lock, AlertCircle, Pencil, LogOut, KeyRound, Globe, ScrollText, Home as HomeIcon } from 'lucide-react';
import Avatar from './ui/Avatar';
import IconButton from './ui/IconButton';

const GENERAL_SQUAD_ID = "general-lobby";

export default function SquadTab({ user, squadCode, joinSquad, squadMembers, squadData }) {
  const [inputCode, setInputCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhoto, setNewPhoto] = useState(""); // New state for photo URL
  const [isEditing, setIsEditing] = useState(false);

  // Login State
  const [authMode, setAuthMode] = useState("google");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const handleUpdateProfile = async () => {
    if (!user) return;

    const updates = {};
    if (newName.trim()) updates.displayName = newName;
    if (newPhoto.trim()) updates.photoURL = newPhoto;

    if (Object.keys(updates).length > 0) {
        // 1. Update Auth Profile
        await updateProfile(user, updates);

        // 2. Update Database Entry
        if (squadCode) {
            const memberRef = doc(db, 'squads', squadCode, 'members', user.uid);
            await setDoc(memberRef, {
                name: newName || user.displayName,
                photo: newPhoto || user.photoURL
            }, { merge: true });
        }

        window.location.reload();
    }
    setIsEditing(false);
  };

  const handleJoinGeneral = () => {
      joinSquad(GENERAL_SQUAD_ID);
      setInputCode("");
  };

  const handleEmailAuth = async (e) => {
      e.preventDefault();
      setAuthError("");
      try {
          if (isRegistering) {
              const res = await createUserWithEmailAndPassword(auth, email, password);
              await updateProfile(res.user, { displayName: email.split('@')[0] });
          } else {
              await signInWithEmailAndPassword(auth, email, password);
          }
      } catch (err) {
          setAuthError(err.message.replace("Firebase: ", ""));
      }
  };

  // --- LOGGED OUT VIEW ---
  if (!user) {
    return (
        <div className="tab-content">
            <div className="card auth-card">
                <h2>Tarkov Tracker Sync</h2>

                <div className="auth-tabs">
                    <button type="button" className={`toggle-btn ${authMode === 'google' ? 'active' : ''}`} onClick={() => setAuthMode('google')}>Google</button>
                    <button type="button" className={`toggle-btn ${authMode === 'email' ? 'active' : ''}`} onClick={() => setAuthMode('email')}>Email / Password</button>
                </div>

                {authMode === 'google' ? (
                    <div style={{padding: '20px 0'}}>
                         <button onClick={() => signInWithPopup(auth, googleProvider)} className="btn-google">
                            <img src="https://www.google.com/favicon.ico" width="20" alt="" /> Sign in with Google
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleEmailAuth} className="auth-form">
                        <div className="input-with-icon">
                          <Mail size={16} />
                          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required />
                        </div>
                        <div className="input-with-icon">
                          <Lock size={16} />
                          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required />
                        </div>
                        {authError && <div className="alert-error"><AlertCircle size={14} /> {authError}</div>}
                        <button type="submit" className="btn btn-primary">{isRegistering ? "Create Account" : "Log In"}</button>
                        <div className="auth-switch">{isRegistering ? "Already have an account?" : "Need an account?"} <span onClick={() => setIsRegistering(!isRegistering)}>{isRegistering ? "Log In" : "Register"}</span></div>
                    </form>
                )}
            </div>
        </div>
    );
  }

  const isGeneral = squadCode === GENERAL_SQUAD_ID;

  return (
    <div className="tab-content">
      {/* USER HEADER */}
      <div className="card profile-bar">
        <div className="profile-bar-identity">
            <Avatar src={user.photoURL} name={user.displayName} size={50} />

            {/* Edit Mode */}
            {isEditing ? (
                <div className="profile-edit-form">
                    <input
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        placeholder="Display Name"
                    />
                    <input
                        value={newPhoto}
                        onChange={e => setNewPhoto(e.target.value)}
                        placeholder="Image URL (https://...)"
                    />
                    <div className="profile-edit-actions">
                        <button onClick={handleUpdateProfile} className="btn btn-success" style={{padding: '4px 12px'}}>Save</button>
                        <button onClick={() => setIsEditing(false)} className="btn" style={{padding: '4px 12px'}}>Cancel</button>
                    </div>
                </div>
            ) : (
                <div className="profile-name-row">
                    <span className="name">{user.displayName}</span>
                    <IconButton
                        icon={Pencil}
                        label="Edit profile"
                        size={14}
                        onClick={() => { setIsEditing(true); setNewName(user.displayName || ""); setNewPhoto(user.photoURL || ""); }}
                    />
                </div>
            )}
        </div>
        <button onClick={() => signOut(auth)} className="btn" style={{padding: '8px 16px'}}><LogOut size={16} /> Sign Out</button>
      </div>

      {/* JOIN CONTROLS */}
      <div className="filters join-controls">
        <div className="join-controls-row">
            <div className="input-with-icon">
              <KeyRound size={16} />
              <input
                  placeholder="Enter Private Code..."
                  value={inputCode}
                  onChange={e => setInputCode(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={() => joinSquad(inputCode)} disabled={!inputCode.trim()}>
                Join Private
            </button>
        </div>

        <button
            className={`btn ${isGeneral ? 'btn-success' : ''}`}
            onClick={handleJoinGeneral}
            disabled={isGeneral}
        >
            <Globe size={16} /> {isGeneral ? "You are in the General Channel" : "Join General Channel (Public)"}
        </button>
      </div>

      <h3 className="section-title">
          {isGeneral ? "General Channel" : `Squad: ${squadCode}`} Members ({squadMembers.length})
      </h3>

      <div className="station-grid">
        {squadMembers.map(m => {
            const data = squadData[m.uid] || {};
            const h = data.hideout || {};
            const q = data.quests || [];
            const activeStations = Object.entries(h).filter(([, lvl]) => lvl > 0);

            return (
                <div key={m.uid} className="card member-card">
                    <div className="member-card-header">
                        <Avatar src={m.photo} name={m.name} size={30} />
                        <h3>{m.name}</h3>
                    </div>

                    <div className="member-stat"><ScrollText size={14} /> Quests Completed: <b>{q.length}</b></div>

                    {activeStations.length > 0 ? (
                        <div className="member-stations">
                            {activeStations.map(([name, lvl]) => (
                                <span key={name} className="member-station-pill">
                                    {name}: <span className="lvl">{lvl}</span>
                                </span>
                            ))}
                        </div>
                    ) : (
                        <div className="member-empty"><HomeIcon size={14} className="icon-inline" /> No hideout stations built yet.</div>
                    )}
                </div>
            );
        })}
      </div>
    </div>
  );
}
