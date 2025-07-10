// page.js
"use client";

import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

function encrypt(text, key) {
  return btoa(text + "::" + key);
}

function decrypt(cipher, key) {
  const decoded = atob(cipher);
  const parts = decoded.split("::");
  if (parts.length === 2 && parts[1] === key) {
    return parts[0];
  }
  throw new Error("Key mismatch or corrupted data.");
}

function randomString(length = 16) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}


function md5sum(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).substring(0, 8);
}

function readableFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function exportChat(messages) {
  let chatContent = "--- Chat History ---\n\n";
  messages.forEach((m) => {
    if (m.from === "[NOTICE]") {
      chatContent += `[NOTICE]: ${m.text}\n`;
    } else if (m.text) {
      chatContent += `${m.from}: ${m.text}\n`;
    } else if (m.file) {
      chatContent += `${m.from}: [FILE] ${m.file.name} (${m.file.size}, MD5: ${m.file.hash})\n`;
    }
  });

  const blob = new Blob([chatContent], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `chat_export_${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


let socket;

export default function Page() {
  const [roomId, setRoomId] = useState("");
  const [roomKey, setRoomKey] = useState("");
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [joined, setJoined] = useState(false);
  const [showId, setShowId] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [enterToSend, setEnterToSend] = useState(true);
  const chatRef = useRef();
  const [theme, setTheme] = useState('light');

  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const showCustomAlert = (message) => {
    setAlertMessage(message);
    setShowAlert(true);
  };

  const closeCustomAlert = () => {
    setShowAlert(false);
    setAlertMessage("");
  };


  useEffect(() => {
    socket = io("http://82.208.22.200:38883");

    socket.on("connect", () => {
      console.log("Connected to Socket.IO server!");
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from Socket.IO server.");
    });

    socket.on("receive-message", ({ from, text, file }) => {
      if (file) {
        try {
          const decrypted = decrypt(file, roomKey);
          const obj = JSON.parse(decrypted);
          setMessages((prev) => [...prev, { from, file: obj, type: "file" }]);
        } catch (error) {
          console.error("Failed to decrypt file:", error);
          setMessages((prev) => [...prev, { from, text: "[Corrupted file or wrong key]", type: "error" }]);
        }
      } else {
        try {
          const plain = decrypt(text, roomKey);
          setMessages((prev) => [...prev, { from, text: plain }]);
        } catch (error) {
          console.error("Failed to decrypt message:", error);
          setMessages((prev) => [...prev, { from, text: "[Corrupted message or wrong key]", type: "error" }]);
        }
      }
    });

    socket.on("receive-notice", (text) => {
      setMessages((prev) => [...prev, { from: "[NOTICE]", text }]);
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [roomKey]); // roomKey sebagai dependency untuk memastikan useEffect berjalan jika roomKey berubah

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTo({
        top: chatRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  useEffect(() => {
    if (joined && chatRef.current) {
      chatRef.current.scrollTo({
        top: chatRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [joined]);


  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  function join() {
    if (!roomId || !roomKey || !nickname) {
      showCustomAlert("Room ID, Room Key, and Nickname cannot be empty.");
      return;
    }
    socket.emit("join-room", { roomId, nickname });
    setJoined(true);
    setShowId(false);
  }

  function send() {
    if (!message.trim()) return;
    const encrypted = encrypt(message.trim(), roomKey);
    socket.emit("send-message", { roomId, from: nickname, text: encrypted });
    setMessage("");
  }


  function leaveRoom() {
    socket.emit("leave-room", { roomId, nickname });
    setJoined(false);
    setMessages([]);
    setRoomId("");
    setRoomKey("");
    setNickname("");
  }

  function getRandomBaseWord() {
    const baseWords = [
      "flower", "skylight", "blackrock", "shadow", "whisper", "echo", "spirit", "dream",
      "harmony", "glimmer", "sparkle", "crystal", "velvet", "blaze", "frost", "mist",
      "ocean", "mountain", "forest", "river", "cloud", "star", "moon", "sun",
      "galaxy", "nebula", "comet", "horizon", "summit", "meadow", "garden", "haven",
      "beacon", "lantern", "torch", "flame", "ember", "stone", "rock", "gem",
      "diamond", "ruby", "sapphire", "obsidian", "lava", "spring", "waterfall", "breeze",
      "storm", "vortex", "abyss", "oasis", "mirage", "phantom", "ghost", "angel",
      "dragon", "phoenix", "unicorn", "legend", "mythic", "ancient", "cosmic", "stellar",
      "lunar", "solar", "vibrant", "brave", "bold", "swift", "silent", "mystic",
      "pure", "happy", "gentle", "free", "golden", "silver", "emerald", "azure",
      "crimson", "indigo", "violet", "amber", "sapphire", "jade", "pearl", "coral",
      "velvet", "satin", "silk", "cotton", "linen", "denim", "leather", "fur",
      "feather", "scale", "claw", "fang", "horn", "wing", "fin", "tail",
      "mane", "hoof", "paw", "track", "trail", "path", "road", "street",
      "avenue", "lane", "alley", "passage", "corridor", "hall", "room", "chamber",
      "vault", "crypt", "dungeon", "cavern", "grotto", "cave", "lair", "nest",
      "hive", "colony", "swarm", "flock", "herd", "pack", "pride", "school",
      "troop", "gang", "crew", "team", "squad", "unit", "corps", "legion",
      "army", "host", "multitude", "horde", "throng", "crowd", "mob", "mass",
      "entity", "being", "creature", "beast", "monster", "fiend", "demon", "deity",
      "god", "goddess", "divine", "celestial", "heavenly", "ethereal", "astral", "spectral",
      "universal", "infinite", "eternal", "timeless", "ageless", "primeval", "primordial", "original",
      "first", "alpha", "omega", "beginning", "end", "dawn", "dusk", "twilight",
      "midnight", "daybreak", "sunrise", "sunset", "moonrise", "moonset", "solstice", "equinox",
      "zenith", "nadir", "apex", "base", "top", "bottom", "front", "back",
      "left", "right", "north", "south", "east", "west", "up", "down",
      "in", "out", "inside", "outside", "above", "below", "before", "after",
      "past", "present", "future", "now", "then", "always", "never", "forever",
      "moment", "instant", "second", "minute", "hour", "day", "week", "month",
      "year", "decade", "century", "millennium", "eon", "age", "era", "epoch",
      "period", "cycle", "loop", "spiral", "helix", "orbit", "route", "track",
      "design", "form", "shape", "figure", "symbol", "sigil", "rune", "glyph",
      "cipher", "enigma", "riddle", "puzzle", "maze", "labyrinth", "quest", "journey",
      "odyssey", "expedition", "voyage", "pilgrim", "wanderer", "traveler", "explorer", "pioneer",
      "settler", "guardian", "protector", "defender", "champion", "hero", "tale", "story",
      "chronicle", "annals", "history", "legacy", "heritage", "tradition", "culture", "art",
      "music", "poetry", "verse", "rhythm", "melody", "symphony", "opera", "ballet",
      "dance", "drama", "comedy", "tragedy", "mask", "stage", "curtain", "spotlight",
      "ovation", "applause", "encore", "finale", "climax", "pinnacle", "crest", "crown",
      "halo", "aura", "glow", "radiance", "shimmer", "twinkle", "gleam", "flash",
      "burst", "flare", "nova", "supernova", "quasar", "pulsar", "blackhole", "wormhole",
      "spacetime", "dimension", "reality", "illusion", "dreamscape", "mindscape", "soul", "essence",
      "core", "heart", "center", "origin", "source", "fount", "well", "root",
      "base", "foundation", "pillar", "column", "tower", "spire", "obelisk", "pyramid",
      "temple", "shrine", "altar", "sanctum", "tomb", "grave", "burial", "cemetery",
      "mausoleum", "monument", "memorial", "statue", "sculpture", "painting", "drawing", "sketch",
      "mural", "fresco", "tapestry", "mosaic", "collage", "assemblage", "installation", "performance",
      "ritual", "ceremony", "rite", "chant", "invocation", "prayer", "meditation", "trance",
      "vision", "fantasy", "hallucination", "nightmare", "reverie", "daydream", "imagination", "creativity",
      "inspiration", "muse", "genius", "talent", "skill", "craft", "artistry", "mastery",
      "expertise", "knowledge", "wisdom", "insight", "understanding", "reason", "logic", "intuition",
      "instinct", "sense", "perception", "awareness", "consciousness", "mind", "brain", "intellect",
      "thought", "idea", "concept", "theory", "hypothesis", "principle", "law", "rule",
      "guideline", "code", "creed", "doctrine", "dogma", "belief", "faith", "hope",
      "charity", "love", "joy", "peace", "patience", "kindness", "goodness", "faithfulness",
      "selfcontrol", "virtue", "morality", "ethics", "justice", "truth", "honor", "courage",
      "strength", "power", "might", "force", "energy", "vigor", "vitality", "life",
      "death", "rebirth", "renewal", "resurrection", "eternity", "infinity", "unity", "oneness",
      "wholeness", "completeness", "perfection", "purity", "innocence", "grace", "blessing", "miracle",
      "wonder", "awe", "beauty", "splendor", "glory", "majesty", "grandeur", "magnificence",
      "brilliance", "luster", "sheen", "sparkle", "glitter", "shimmer", "gleam", "glow",
      "light", "darkness", "shadow", "shade", "gloom", "mist", "fog", "haze",
      "veil", "curtain", "cloak", "shroud", "mantle", "robe", "garment", "attire",
      "costume", "disguise", "mask", "face", "visage", "countenance", "expression", "smile",
      "frown", "grin", "scowl", "gaze", "stare", "glance", "look", "sight",
      "vision", "eye", "iris", "pupil", "retina", "lens", "optic", "nerve",
      "brain", "mind", "thought", "idea", "concept", "theory", "hypothesis", "principle",
      "law", "rule", "guideline", "code", "creed", "doctrine", "dogma", "belief",
      "faith", "hope", "charity", "love", "joy", "peace", "patience", "kindness",
      "goodness", "faithfulness", "gentleness", "selfcontrol", "virtue", "morality", "ethics", "justice",
      "truth", "honor", "courage", "bravery", "valor", "strength", "power", "might",
      "force", "energy", "vigor", "vitality", "life", "death", "rebirth", "renewal",
      "resurrection", "eternity", "infinity", "unity", "oneness", "wholeness", "completeness", "perfection",
      "purity", "innocence", "grace", "blessing", "miracle", "wonder", "awe", "beauty",
      "splendor", "glory", "majesty", "grandeur", "magnificence", "brilliance", "radiance", "luster",
      "sheen", "sparkle", "glitter", "shimmer", "gleam", "glow", "light", "darkness",
      "shadow", "shade", "gloom", "mist", "fog", "haze", "veil", "curtain",
      "cloak", "shroud", "mantle", "robe", "garment", "attire", "costume", "disguise",
      "mask", "face", "visage", "countenance", "expression", "smile", "frown", "grin",
      "scowl", "gaze", "stare", "glance", "look", "sight", "vision", "eye",
      "iris", "pupil", "retina", "lens", "optic", "nerve", "brain", "mind",
      "thought", "idea", "concept", "theory", "hypothesis", "principle", "law", "rule",
      "guideline", "code", "creed", "doctrine", "dogma", "belief", "faith", "hope",
      "charity", "love", "joy", "peace", "patience", "kindness", "goodness", "faithfulness",
      "gentleness", "selfcontrol", "virtue", "morality", "ethics", "justice", "truth", "honor",
      "courage", "bravery", "valor", "strength", "power", "might", "force", "energy",
      "vigor", "vitality", "life", "death", "rebirth", "renewal", "resurrection", "eternity",
      "infinity", "unity", "oneness", "wholeness", "completeness", "perfection", "purity"
    ];
    const randomIndex = Math.floor(Math.random() * baseWords.length);
    return baseWords[randomIndex];
  }

  function generateRoom() {
    setRoomId(randomString(32));
    setRoomKey(randomString(16));
    setNickname(getRandomBaseWord() + "_" + Math.floor(Math.random() * 9999));
  }

  function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showCustomAlert("Copied successfully!");
    } catch (err) {
      console.error('Failed to copy:', err);
      showCustomAlert("Failed to copy. Please copy manually.");
    }
    document.body.removeChild(textarea);
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // File size limit (e.g., 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showCustomAlert("File size too large (max 5MB).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(",")[1];
      const hash = md5sum(base64);
      const size = readableFileSize(file.size);
      const fileData = {
        name: file.name,
        type: file.type,
        data: base64,
        size,
        hash,
      };
      const encrypted = encrypt(JSON.stringify(fileData), roomKey);

      socket.emit("send-message", {
        roomId,
        from: nickname,
        file: encrypted,
      });

    };
    reader.readAsDataURL(file);
  }


  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme === 'dark' ? 'from-gray-900 to-gray-800' : 'from-blue-50 to-indigo-100'} text-${theme === 'dark' ? 'white' : 'gray-900'} font-inter p-4 sm:p-6 md:p-8`}>
      <div className={`max-w-2xl mx-auto ${theme === 'dark' ? 'bg-gray-850' : 'bg-white'} rounded-2xl shadow-xl overflow-hidden flex flex-col h-[calc(100vh-32px)]`}> {/* Adjusted h-calc here */}
        <header className={`bg-blue-600 ${theme === 'dark' ? 'bg-gray-900' : 'bg-blue-600'} text-white p-4 text-center rounded-t-2xl shadow-md flex justify-between items-center`}>
          <div className="flex-1 text-center">
            <h1 className="text-2xl font-extrabold tracking-tight">Chat</h1>
            <p className="text-sm opacity-90">End-to-end encrypted chat</p>
          </div>
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition duration-200"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h1M3 12H2m15.325-6.675l-.707-.707M6.675 17.325l-.707.707M18.675 18.675l.707.707M5.325 5.325l.707-.707M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
        </header>

        <main className="p-6 flex flex-col flex-1 overflow-hidden"> {/* main becomes flex-col and takes remaining height */}
          {!joined ? (
            <div className="space-y-5">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Room ID</label>
                <div className="relative">
                  <input
                    type={showId ? "text" : "password"}
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="w-full p-3 pr-24 border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                    placeholder="Enter Room ID"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <button
                      onClick={() => setShowId(!showId)}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium mr-2"
                    >
                      {showId ? "Hide" : "Show"}
                    </button>
                    <button
                      onClick={() => copyToClipboard(roomId)}
                      className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Room Key</label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={roomKey}
                    onChange={(e) => setRoomKey(e.target.value)}
                    className="w-full p-3 pr-24 border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                    placeholder="Enter Room Key"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <button
                      onClick={() => setShowKey(!showKey)}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium mr-2"
                    >
                      {showKey ? "Hide" : "Show"}
                    </button>
                    <button
                      onClick={() => copyToClipboard(roomKey)}
                      className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Nickname</label>
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                  placeholder="Enter Your Nickname"
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
                <button
                  onClick={join}
                  className="w-full sm:w-auto bg-blue-600 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition duration-300 transform hover:scale-105"
                >
                  Join
                </button>
                <button
                  onClick={generateRoom}
                  className="w-full sm:w-auto text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline hover:text-blue-800 dark:hover:text-blue-300 transition duration-200"
                >
                  Create New Room
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                  Room ID: {showId ? (
                    <span className="font-mono text-blue-600 dark:text-blue-400 text-lg">{roomId}</span>
                  ) : (
                    <span className="font-mono text-gray-500 dark:text-gray-400 text-lg">********</span>
                  )}
                </h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowId(!showId)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline hover:text-blue-800 dark:hover:text-blue-300 transition duration-200"
                  >
                    {showId ? "Hide ID" : "Show ID"}
                  </button>
                  <button
                    onClick={leaveRoom}
                    className="text-sm text-red-500 dark:text-red-400 hover:underline hover:text-red-700 dark:hover:text-red-300 transition duration-200"
                  >
                    Leave
                  </button>
                </div>
              </div>

              <div
                ref={chatRef}
                className={`flex-1 overflow-y-auto p-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'} rounded-xl border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow-inner space-y-4 mb-4 custom-scrollbar min-h-0`}
              >
                {messages.map((m, i) => {
                  const isMe = m.from === nickname;
                  const isNotice = m.from === "[NOTICE]";
                  const isError = m.type === "error";

                  if (isNotice) {
                    return (
                      <div key={i} className="text-center text-indigo-600 dark:text-indigo-400 text-xs italic py-1">
                        {m.text}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={i}
                      className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] px-4 py-2 rounded-2xl shadow-md text-sm break-words ${isMe
                          ? "bg-blue-500 text-white rounded-br-none"
                          : `${theme === 'dark' ? 'bg-gray-700' : 'bg-white'} ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'} rounded-bl-none border ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`
                          } ${isError ? "bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-100" : ""}`}
                      >
                        <div className={`text-xs mb-1 font-semibold ${isMe ? "text-blue-100" : `${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}`}>
                          {isMe ? "You" : m.from}
                        </div>
                        {m.text && <div>{m.text}</div>}
                        {m.file && (
                          <div className="flex items-center space-x-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l3-3m-3 3l-3-3m-3 2V7a2 2 0 012-2h6l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                            </svg>
                            <div>
                              <div className="font-semibold">{m.file.name}</div>
                              <div className="text-xs opacity-80">{m.file.size} | MD5: {m.file.hash}...</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className={`flex items-end gap-3 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'} p-3 rounded-xl shadow-inner`}>
                <label htmlFor="file-upload" className="cursor-pointer p-2 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 transition duration-200">
                  <input id="file-upload" type="file" onChange={handleFileUpload} className="hidden" />
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.586-6.586a4 4 0 10-5.656-5.656l-6.586 6.586a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </label>
                <textarea
                  className={`flex-1 p-3 rounded-xl border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'} ${theme === 'dark' ? 'bg-gray-700' : 'bg-white'} text-${theme === 'dark' ? 'white' : 'gray-900'} resize-none focus:ring-blue-500 focus:border-blue-500 transition duration-200 custom-scrollbar`}
                  rows={1} // Default 1 row, will expand
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    // Automatically adjust textarea height
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  onKeyDown={(e) => {
                    if (enterToSend && e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Type message..."
                ></textarea>
                <button
                  onClick={send}
                  className="p-3 rounded-full bg-green-500 text-white shadow-lg hover:bg-green-600 focus:outline-none focus:ring-4 focus:ring-green-300 transition duration-300 transform hover:scale-105"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-7-7l7 7-7 7" />
                  </svg>
                </button>
              </div>

              <div className="flex justify-between items-center mt-3 text-sm">
                <label className={`flex items-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} cursor-pointer`}>
                  <input
                    type="checkbox"
                    checked={enterToSend}
                    onChange={(e) => setEnterToSend(e.target.checked)}
                    className="mr-2 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  Send with Enter
                </label>
                <button
                  onClick={() => exportChat(messages)}
                  className="text-blue-600 dark:text-blue-400 hover:underline hover:text-blue-800 dark:hover:text-blue-300 transition duration-200"
                >
                  Export Chat
                </button>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Custom Alert Modal */}
      {showAlert && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className={`p-6 rounded-lg shadow-xl max-w-sm w-full text-center ${theme === 'dark' ? 'bg-gray-700' : 'bg-white'}`}>
            <p className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{alertMessage}</p>
            <button
              onClick={closeCustomAlert}
              className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition duration-200"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Inter Font from Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      {/* Tailwind CSS CDN */}
      <script src="https://cdn.tailwindcss.com"></script>
      <style jsx>{`
        .font-inter {
          font-family: 'Inter', sans-serif;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-track {
          background: #333;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #555;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #777;
        }
        /* Adjust textarea height to auto-expand */
        textarea {
          min-height: 48px; /* Minimum height for 1 row */
          max-height: 150px; /* Maximum height before scrolling */
        }
      `}</style>
    </div>
  );
}
