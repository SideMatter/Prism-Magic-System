"use client";

import { useState, useEffect } from "react";

interface CardData {
  name: string;
  markup: string;
  html: string;
  created_when?: string;
  modified_when?: string;
}

export default function DDD() {
  const [card, setCard] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visitorCount] = useState(() => Math.floor(Math.random() * 9000) + 1000);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function fetchCard() {
      try {
        const response = await fetch("/api/supernotes");
        if (!response.ok) {
          throw new Error("Failed to fetch card");
        }
        const data = await response.json();
        setCard(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchCard();
  }, []);

  // Convert markdown-ish content to simple HTML
  const renderContent = (markup: string) => {
    // Basic markdown conversion
    let html = markup
      .replace(/^### (.*$)/gim, '<h3 style="color: #800080; font-family: Comic Sans MS, cursive;">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 style="color: #FF00FF; font-family: Impact, sans-serif;">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 style="color: #FF0000; font-family: Impact, sans-serif; text-shadow: 2px 2px #FFFF00;">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<b style="color: #0000FF;">$1</b>')
      .replace(/\*(.*?)\*/g, '<i style="color: #008000;">$1</i>')
      .replace(/\n/g, '<br>');
    return html;
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000080",
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)",
        backgroundSize: "50px 50px",
        fontFamily: "Times New Roman, serif",
        color: "#00FF00",
        padding: "20px",
      }}
    >
      {/* Marquee Banner */}
      <div
        style={{
          background: "linear-gradient(to right, #FF0000, #FFFF00, #00FF00, #00FFFF, #0000FF, #FF00FF)",
          padding: "5px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}
        >
          <div
            style={{
              display: "inline-block",
              animation: "scroll-left 20s linear infinite",
              fontFamily: "Comic Sans MS, cursive",
              fontSize: "24px",
              color: "#000000",
              fontWeight: "bold",
            }}
          >
            ★彡 WELCOME TO MY AWESOME WEBPAGE!!! 彡★ &nbsp;&nbsp;&nbsp; 
            🌟 YOU ARE VISITOR #{visitorCount}! 🌟 &nbsp;&nbsp;&nbsp;
            ✨ BEST VIEWED IN NETSCAPE NAVIGATOR 4.0 ✨ &nbsp;&nbsp;&nbsp;
            🔥 LAST UPDATED: {currentTime.toLocaleDateString()} 🔥
          </div>
        </div>
      </div>

      {/* Main Table Layout */}
      <table
        width="800"
        align="center"
        cellPadding="0"
        cellSpacing="0"
        style={{
          border: "5px ridge #C0C0C0",
          background: "#000000",
        }}
      >
        <tbody>
          <tr>
            <td
              colSpan={2}
              style={{
                background: "linear-gradient(180deg, #000080 0%, #0000FF 50%, #000080 100%)",
                padding: "15px",
                textAlign: "center",
              }}
            >
              <h1
                style={{
                  fontFamily: "Impact, sans-serif",
                  fontSize: "48px",
                  color: "#FFFF00",
                  textShadow: "3px 3px #FF0000, -1px -1px #00FFFF",
                  margin: 0,
                  letterSpacing: "5px",
                }}
              >
                ✧･ﾟ: *✧･ﾟ:* SECRET PAGE *:･ﾟ✧*:･ﾟ✧
              </h1>
              <p
                style={{
                  fontFamily: "Comic Sans MS, cursive",
                  color: "#00FF00",
                  fontSize: "14px",
                }}
              >
                ~ You found the hidden page! Congratulations! ~
              </p>
            </td>
          </tr>
          <tr>
            {/* Left Sidebar */}
            <td
              valign="top"
              width="150"
              style={{
                background: "linear-gradient(180deg, #800080, #FF00FF, #800080)",
                padding: "10px",
                borderRight: "3px groove #C0C0C0",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <p
                  style={{
                    fontFamily: "Comic Sans MS, cursive",
                    fontSize: "12px",
                    color: "#FFFF00",
                    fontWeight: "bold",
                  }}
                >
                  ~*~ LINKS ~*~
                </p>
                <hr style={{ border: "1px dashed #00FFFF" }} />
                <p>
                  <a href="/" style={{ color: "#00FFFF", textDecoration: "underline" }}>
                    🏠 Home
                  </a>
                </p>
                <p>
                  <a href="/admin" style={{ color: "#FF00FF", textDecoration: "underline" }}>
                    🔧 Admin
                  </a>
                </p>
                <p>
                  <a href="/spell-combiner" style={{ color: "#00FF00", textDecoration: "underline" }}>
                    ✨ Spells
                  </a>
                </p>
                <hr style={{ border: "1px dashed #00FFFF" }} />
                <p
                  style={{
                    fontFamily: "Comic Sans MS, cursive",
                    fontSize: "10px",
                    color: "#FFFFFF",
                  }}
                >
                  Sign my guestbook!
                </p>
                <div
                  style={{
                    background: "#000000",
                    border: "2px inset #808080",
                    padding: "5px",
                    marginTop: "10px",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "Courier New, monospace",
                      fontSize: "10px",
                      color: "#00FF00",
                      margin: 0,
                    }}
                  >
                    VISITORS:
                  </p>
                  <p
                    style={{
                      fontFamily: "Digital, monospace",
                      fontSize: "16px",
                      color: "#FF0000",
                      margin: 0,
                      background: "#001100",
                      padding: "2px",
                    }}
                  >
                    {String(visitorCount).padStart(6, "0")}
                  </p>
                </div>
                <br />
                <div
                  style={{
                    border: "2px outset #C0C0C0",
                    background: "#FFFF00",
                    padding: "3px",
                    fontSize: "8px",
                    color: "#000000",
                  }}
                >
                  <b>BEST VIEWED WITH:</b>
                  <br />
                  Internet Explorer 5.5
                  <br />
                  800x600 resolution
                </div>
                <br />
                <img
                  src="data:image/gif;base64,R0lGODlhEAAQAMQAAP///+7u7t3d3czMzLu7u6qqqpmZmYiIiHd3d2ZmZlVVVURERDMzMyIiIhEREQAAAP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH5BAEAABAALAAAAAAQABAAAAVAICSOZGmeaKqubOu+cCzPdG3feK7vfO//wKBwSCwaj8ikcslsOp/QqHRKrVqv2Kx2y+16v+CweEwum8/otHoNAQA7"
                  alt="Under Construction"
                  style={{ imageRendering: "pixelated" }}
                />
                <p
                  style={{
                    fontFamily: "Comic Sans MS, cursive",
                    fontSize: "10px",
                    color: "#FF0000",
                  }}
                >
                  ⚠️ UNDER CONSTRUCTION ⚠️
                </p>
              </div>
            </td>

            {/* Main Content */}
            <td
              valign="top"
              style={{
                background: "#000033",
                padding: "20px",
              }}
            >
              {loading ? (
                <div style={{ textAlign: "center" }}>
                  <p
                    style={{
                      fontFamily: "Comic Sans MS, cursive",
                      fontSize: "24px",
                      color: "#FFFF00",
                    }}
                  >
                    ⏳ Loading... Please wait...
                  </p>
                  <p style={{ color: "#00FFFF", fontSize: "12px" }}>
                    (This may take a while on your 56k modem!)
                  </p>
                </div>
              ) : error ? (
                <div
                  style={{
                    border: "3px double #FF0000",
                    background: "#330000",
                    padding: "20px",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "Impact, sans-serif",
                      fontSize: "24px",
                      color: "#FF0000",
                    }}
                  >
                    ❌ ERROR 404 ❌
                  </p>
                  <p style={{ color: "#FF6666" }}>{error}</p>
                  <p
                    style={{
                      fontFamily: "Comic Sans MS, cursive",
                      fontSize: "12px",
                      color: "#FFFF00",
                    }}
                  >
                    Try refreshing the page or check back later!
                  </p>
                </div>
              ) : card ? (
                <div>
                  {/* Card Title */}
                  <div
                    style={{
                      border: "3px ridge #FFD700",
                      background: "linear-gradient(180deg, #330066, #660099, #330066)",
                      padding: "15px",
                      marginBottom: "20px",
                      textAlign: "center",
                    }}
                  >
                    <h2
                      style={{
                        fontFamily: "Impact, sans-serif",
                        fontSize: "32px",
                        color: "#FFD700",
                        textShadow: "2px 2px #000000",
                        margin: 0,
                      }}
                    >
                      📜 {card.name} 📜
                    </h2>
                  </div>

                  {/* Card Content */}
                  <div
                    style={{
                      border: "2px inset #808080",
                      background: "#001122",
                      padding: "20px",
                      fontFamily: "Verdana, sans-serif",
                      fontSize: "14px",
                      lineHeight: "1.8",
                      color: "#00FF00",
                    }}
                  >
                    <div
                      dangerouslySetInnerHTML={{
                        __html: card.html || renderContent(card.markup),
                      }}
                      style={{
                        color: "#00FF00",
                      }}
                    />
                  </div>

                  {/* Card Meta */}
                  {(card.created_when || card.modified_when) && (
                    <div
                      style={{
                        marginTop: "20px",
                        padding: "10px",
                        border: "1px dashed #00FFFF",
                        fontFamily: "Courier New, monospace",
                        fontSize: "10px",
                        color: "#00FFFF",
                      }}
                    >
                      {card.created_when && (
                        <p>
                          📅 Created:{" "}
                          {new Date(card.created_when).toLocaleDateString()}
                        </p>
                      )}
                      {card.modified_when && (
                        <p>
                          ✏️ Last Modified:{" "}
                          {new Date(card.modified_when).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : null}

              {/* Fun Extras */}
              <div
                style={{
                  marginTop: "30px",
                  borderTop: "2px dashed #FF00FF",
                  paddingTop: "20px",
                  textAlign: "center",
                }}
              >
                <p
                  style={{
                    fontFamily: "Comic Sans MS, cursive",
                    fontSize: "12px",
                    color: "#FFFF00",
                  }}
                >
                  ✉️ Email me at: webmaster@geocities.com ✉️
                </p>
                <p
                  style={{
                    fontFamily: "Wingdings, sans-serif",
                    fontSize: "24px",
                    color: "#FF00FF",
                  }}
                >
                  ★ ☆ ★ ☆ ★ ☆ ★ ☆ ★
                </p>
                <p
                  style={{
                    fontFamily: "Comic Sans MS, cursive",
                    fontSize: "10px",
                    color: "#808080",
                  }}
                >
                  © 2002 All Rights Reserved | Made with Microsoft FrontPage
                </p>
              </div>
            </td>
          </tr>

          {/* Footer */}
          <tr>
            <td
              colSpan={2}
              style={{
                background: "linear-gradient(180deg, #000080, #0000FF, #000080)",
                padding: "10px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                }}
              >
                <div
                  style={{
                    display: "inline-block",
                    animation: "scroll-alternate 10s ease-in-out infinite alternate",
                    fontFamily: "Comic Sans MS, cursive",
                    fontSize: "14px",
                    color: "#00FF00",
                  }}
                >
                  🎵 MIDI Music Would Be Playing Here If This Was Really 2002 🎵
                </div>
              </div>
              <p
                style={{
                  fontFamily: "Arial, sans-serif",
                  fontSize: "10px",
                  color: "#C0C0C0",
                  margin: "10px 0 0 0",
                }}
              >
                This page is Netscape Navigator 4.0 and Internet Explorer 5.5
                compatible!
                <br />
                Best viewed at 800x600 with 256 colors
              </p>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Blinking Text Effect using CSS */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
          }
          @keyframes rainbow {
            0% { color: #ff0000; }
            14% { color: #ff7f00; }
            28% { color: #ffff00; }
            42% { color: #00ff00; }
            57% { color: #0000ff; }
            71% { color: #4b0082; }
            85% { color: #9400d3; }
            100% { color: #ff0000; }
          }
          @keyframes scroll-left {
            from { transform: translateX(100%); }
            to { transform: translateX(-100%); }
          }
          @keyframes scroll-alternate {
            from { transform: translateX(0); }
            to { transform: translateX(50px); }
          }
        `
      }} />

      {/* Bottom Decorations */}
      <div style={{ textAlign: "center", marginTop: "20px" }}>
        <p
          style={{
            fontFamily: "Comic Sans MS, cursive",
            fontSize: "16px",
            color: "#FF00FF",
            animation: "rainbow 3s linear infinite",
          }}
        >
          ♫♪♫ Thanks for visiting! Come back soon! ♫♪♫
        </p>
        <div
          style={{
            display: "inline-flex",
            gap: "10px",
            marginTop: "10px",
          }}
        >
          <div
            style={{
              border: "2px outset #C0C0C0",
              background: "#CCCCCC",
              padding: "2px 8px",
              fontFamily: "Arial, sans-serif",
              fontSize: "10px",
              color: "#000000",
            }}
          >
            🔗 Link to me!
          </div>
          <div
            style={{
              border: "2px outset #C0C0C0",
              background: "#CCCCCC",
              padding: "2px 8px",
              fontFamily: "Arial, sans-serif",
              fontSize: "10px",
              color: "#000000",
            }}
          >
            📖 View Source
          </div>
          <div
            style={{
              border: "2px outset #C0C0C0",
              background: "#CCCCCC",
              padding: "2px 8px",
              fontFamily: "Arial, sans-serif",
              fontSize: "10px",
              color: "#000000",
            }}
          >
            🏆 Awards
          </div>
        </div>
      </div>

      {/* Cursor Trail Effect */}
      <div
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          background: "#FFFF00",
          border: "2px solid #000000",
          padding: "10px",
          fontFamily: "Comic Sans MS, cursive",
          fontSize: "12px",
          color: "#000000",
          zIndex: 1000,
        }}
      >
        <b>Current Time:</b>
        <br />
        {currentTime.toLocaleTimeString()}
        <br />
        <span style={{ fontSize: "10px" }}>
          {currentTime.toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

