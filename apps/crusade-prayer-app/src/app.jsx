import { useState, useEffect, useRef } from 'preact/hooks';

const BASE_URL = 'https://crusadeprayergroup.org/';
const MENU_ITEMS = [
  { id: 'index.html', title: 'Home' },
  { id: 'Sunday.html', title: 'Sunday Prayers' },
  { id: 'Monday.html', title: 'Monday Prayers' },
  { id: 'Tuesday.html', title: 'Tuesday Prayers' },
  { id: 'Wednesday.html', title: 'Wednesday Prayers' },
  { id: 'Thursday.html', title: 'Thursday Prayers' },
  { id: 'Friday.html', title: 'Friday Prayers' },
  { id: 'Saturday.html', title: 'Saturday Prayers' },
  { id: 'crusade.html', title: 'Crusade Prayers' },
  { id: 'rosary.html', title: 'Holy Rosary' },
  { id: 'dmc.html', title: 'Divine Mercy Chaplet' }
];

export function App() {
  const [view, setView] = useState('menu');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [optionsIndex, setOptionsIndex] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [textSearchQuery, setTextSearchQuery] = useState('');
  const [isSearchingInText, setIsSearchingInText] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  
  const listRef = useRef(null);
  const scrollRef = useRef(null);
  const searchInputRef = useRef(null);

  const OPTIONS = [
    { id: 'top', title: 'Jump to Top' },
    { id: 'bottom', title: 'Jump to Bottom' },
    { id: 'search', title: 'Search in Text' },
    { id: 'theme', title: isDarkMode ? 'Light Mode' : 'Dark Mode' }
  ];

  const filteredItems = MENU_ITEMS.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const getHighlightedContent = () => {
    if (!content || !textSearchQuery) return content?.html;
    const escapedQuery = textSearchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    
    let matchIdx = -1;
    return content.html.replace(/(>)([^<]+)(<)/g, (match, p1, p2, p3) => {
        return p1 + p2.replace(regex, (m) => {
            matchIdx++;
            const isCurrent = matchIdx === currentMatchIndex;
            return `<mark class="highlight ${isCurrent ? 'current' : ''}">${m}</mark>`;
        }) + p3;
    });
  };

  useEffect(() => {
    if (!content || !textSearchQuery) {
      setMatchCount(0);
      setCurrentMatchIndex(0);
      return;
    }
    const escapedQuery = textSearchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const textOnly = content.html.replace(/<[^>]*>/g, ' ');
    const matches = textOnly.match(regex);
    setMatchCount(matches ? matches.length : 0);
    if (!matches) setCurrentMatchIndex(0);
    else if (currentMatchIndex >= matches.length) setCurrentMatchIndex(0);
  }, [textSearchQuery, content]);

  useEffect(() => {
    if (isSearchingInText && matchCount > 0) {
      setTimeout(() => {
        const currentMark = document.querySelector('mark.highlight.current');
        if (currentMark && scrollRef.current) {
          const container = scrollRef.current;
          const rect = currentMark.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          
          if (rect.top < containerRect.top || rect.bottom > containerRect.bottom) {
             currentMark.scrollIntoView({ behavior: 'auto', block: 'center' });
          }
        }
      }, 50);
    }
  }, [currentMatchIndex, isSearchingInText, textSearchQuery]);
  
  const fetchPage = async (pageId) => {
    setLoading(true);
    setError(null);
    try {
      const targetUrl = BASE_URL + pageId;
      const isDevelopment = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1' ||
                           window.location.protocol === 'http:';
      
      let html;
      if (isDevelopment) {
        const fetchUrl = `/api/proxy?url=${encodeURIComponent(targetUrl)}`;
        const response = await fetch(fetchUrl);
        html = await response.text();
      } else {
        html = await new Promise((resolve, reject) => {
          try {
            const xhr = new (window.XMLHttpRequest || XMLHttpRequest)({ mozSystem: true });
            xhr.open('GET', targetUrl);
            xhr.onreadystatechange = () => {
              if (xhr.readyState === 4) {
                if (xhr.status >= 200 && xhr.status < 300) {
                  resolve(xhr.responseText);
                } else {
                  reject(new Error(`HTTP error! status: ${xhr.status}`));
                }
              }
            };
            xhr.onerror = () => reject(new Error('Network Error - check connection'));
            xhr.send();
          } catch (e) {
            reject(new Error('XHR Creation failed: ' + e.message));
          }
        });
      }
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const mainContent = doc.querySelector('.contentLeftinside') || doc.querySelector('.content') || doc.body;
      
      const cleanContent = mainContent.innerHTML
        .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, '')
        .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, '')
        .replace(/href="([^"]+)"/g, 'href="#"');
        
      setContent({
        title: MENU_ITEMS.find(i => i.id === pageId).title,
        html: cleanContent
      });
      setView('details');
    } catch (err) {
      console.error(err);
      setError('Failed to fetch content. Check connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (showOptions) {
      switch (e.key) {
        case 'ArrowDown':
          setOptionsIndex(prev => (prev + 1) % OPTIONS.length);
          break;
        case 'ArrowUp':
          setOptionsIndex(prev => (prev - 1 + OPTIONS.length) % OPTIONS.length);
          break;
        case 'Enter':
          const opt = OPTIONS[optionsIndex];
          if (opt.id === 'top') if (scrollRef.current) scrollRef.current.scrollTop = 0;
          if (opt.id === 'bottom') if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          if (opt.id === 'theme') setIsDarkMode(!isDarkMode);
          if (opt.id === 'search') {
            setIsSearchingInText(true);
            setTextSearchQuery('');
            setCurrentMatchIndex(0);
            setTimeout(() => searchInputRef.current?.focus(), 50);
          }
          setShowOptions(false);
          break;
        case 'SoftRight':
        case 'Backspace':
          setShowOptions(false);
          break;
      }
      return;
    }

    if (isSearchingInText) {
      if (e.key === 'Enter' || e.key === 'SoftLeft') {
        setIsSearchingInText(false);
      } else if (e.key === 'ArrowDown') {
        if (matchCount > 0) {
          setCurrentMatchIndex(prev => (prev + 1) % matchCount);
          e.preventDefault();
        }
      } else if (e.key === 'ArrowUp') {
        if (matchCount > 0) {
          setCurrentMatchIndex(prev => (prev - 1 + matchCount) % matchCount);
          e.preventDefault();
        }
      }
      return;
    }

    if (isSearching) {
      if (e.key === 'Enter' || e.key === 'SoftLeft') {
        setIsSearching(false);
      } else if (e.key === 'ArrowDown') {
        if (filteredItems.length > 0) {
          setSelectedIndex(prev => (prev + 1) % filteredItems.length);
          e.preventDefault();
        }
      } else if (e.key === 'ArrowUp') {
        if (filteredItems.length > 0) {
          setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
          e.preventDefault();
        }
      }
      return;
    }

    const scrollAmount = 60;
    const fastScrollAmount = 240;

    switch (e.key) {
      case 'ArrowDown':
        if (view === 'menu') {
          setSelectedIndex(prev => (prev + 1) % filteredItems.length);
        } else if (view === 'details' && scrollRef.current) {
          scrollRef.current.scrollTop += scrollAmount;
        }
        break;
      case 'ArrowUp':
        if (view === 'menu') {
          setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
        } else if (view === 'details' && scrollRef.current) {
          scrollRef.current.scrollTop -= scrollAmount;
        }
        break;
      case 'ArrowRight':
        if (view === 'menu') {
          setSelectedIndex(prev => Math.min(prev + 3, filteredItems.length - 1));
        } else if (view === 'details' && scrollRef.current) {
          scrollRef.current.scrollTop += fastScrollAmount;
        }
        break;
      case 'ArrowLeft':
        if (view === 'menu') {
          setSelectedIndex(prev => Math.max(prev - 3, 0));
        } else if (view === 'details' && scrollRef.current) {
          scrollRef.current.scrollTop -= fastScrollAmount;
        }
        break;
      case 'Enter':
        if (view === 'menu' && filteredItems.length > 0) {
          fetchPage(filteredItems[selectedIndex].id);
        }
        break;
      case 'SoftLeft':
        if (view === 'menu') {
          setIsSearching(true);
          setTimeout(() => searchInputRef.current?.focus(), 50);
        } else {
          setView('menu');
        }
        break;
      case 'SoftRight':
        if (view === 'details') {
          setShowOptions(true);
          setOptionsIndex(0);
        }
        break;
      case 'Backspace':
        if (view === 'details' || error) {
          e.preventDefault();
          setView('menu');
          setError(null);
        }
        break;
    }
  };

  useEffect(() => {
    document.body.classList.toggle('dark-mode', isDarkMode);
  }, [isDarkMode]);

  // Persistence logic
  useEffect(() => {
    try {
      const savedState = localStorage.getItem('crusade-prayer-state');
      if (savedState) {
        const state = JSON.parse(savedState);
        if (state.view) setView(state.view);
        if (state.selectedIndex !== undefined) setSelectedIndex(state.selectedIndex);
        if (state.content) setContent(state.content);
        if (state.isDarkMode !== undefined) setIsDarkMode(state.isDarkMode);
        
        // Restore scroll after content is likely rendered
        if (state.view === 'details' && state.scrollTop) {
          setTimeout(() => {
            if (scrollRef.current) scrollRef.current.scrollTop = state.scrollTop;
          }, 150);
        }
      }
    } catch (e) {
      console.error('Failed to restore state:', e);
      localStorage.removeItem('crusade-prayer-state');
    }
  }, []);

  useEffect(() => {
    const state = {
      view,
      selectedIndex,
      content,
      isDarkMode,
      scrollTop: scrollRef.current ? scrollRef.current.scrollTop : 0
    };
    localStorage.setItem('crusade-prayer-state', JSON.stringify(state));
  }, [view, selectedIndex, content, isDarkMode]);

  // Periodic scroll save for "phone off" scenario
  useEffect(() => {
    const interval = setInterval(() => {
      if (view === 'details' && scrollRef.current) {
        const stateStr = localStorage.getItem('crusade-prayer-state');
        if (stateStr) {
          const state = JSON.parse(stateStr);
          state.scrollTop = scrollRef.current.scrollTop;
          localStorage.setItem('crusade-prayer-state', JSON.stringify(state));
        }
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [view]);

  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data && e.data.type === 'kaios-key-event') {
        const { type, key, keyCode } = e.data.detail;
        const event = new KeyboardEvent(type, { key, keyCode, bubbles: true });
        window.dispatchEvent(event);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, selectedIndex, error, isSearching, filteredItems, showOptions, optionsIndex, isDarkMode, isSearchingInText, matchCount, currentMatchIndex]);

  useEffect(() => {
    if (view === 'menu' && listRef.current) {
        const item = listRef.current.children[selectedIndex];
        if (item) {
            item.scrollIntoView({ block: 'nearest' });
        }
    }
  }, [selectedIndex, view]);

  return (
    <div className="app-container">
      <header className="header">
        <h1>{view === 'menu' ? (filteredItems[selectedIndex]?.title || 'Crusade Prayer') : content?.title}</h1>
      </header>
      
      {isSearching && (
        <div className="search-container">
          <input 
            ref={searchInputRef}
            type="text" 
            className="search-input" 
            placeholder="Search..." 
            value={searchQuery}
            onInput={(e) => {
              setSearchQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
        </div>
      )}

      {isSearchingInText && (
        <div className="search-container text-search">
          <input 
            ref={searchInputRef}
            type="text" 
            className="search-input" 
            placeholder="Find in text..." 
            value={textSearchQuery}
            onInput={(e) => {
              setTextSearchQuery(e.target.value);
              setCurrentMatchIndex(0);
            }}
          />
          {matchCount > 0 && (
            <div className="search-counter">
              {currentMatchIndex + 1}/{matchCount}
            </div>
          )}
        </div>
      )}

      <main className="content">
        {loading && (
          <div className="status-msg">
            <div className="spinner"></div>
            <p>Loading...</p>
          </div>
        )}
        
        {error && (
          <div className="status-msg">
            <p className="error">{error}</p>
            <p>Press Back to return</p>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="menu-view" style={{ display: view === 'menu' ? 'block' : 'none' }}>
              <ul className="menu-list" ref={listRef}>
                {filteredItems.map((item, index) => (
                  <li 
                    key={item.id} 
                    className={`menu-item ${index === selectedIndex ? 'focused' : ''}`}
                  >
                    {item.title}
                  </li>
                ))}
                {filteredItems.length === 0 && <li className="menu-item">No results found</li>}
              </ul>
            </div>

            <div className="details-view" ref={scrollRef} style={{ display: view === 'details' ? 'block' : 'none' }}>
              {content && (
                <div className="text-content" dangerouslySetInnerHTML={{ __html: getHighlightedContent() }}></div>
              )}
            </div>
          </>
        )}

        {showOptions && (
          <div className="options-menu-overlay">
            <div className="options-menu">
              {OPTIONS.map((opt, idx) => (
                <div key={opt.id} className={`options-menu-item ${idx === optionsIndex ? 'focused' : ''}`}>
                  {opt.title}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="softkeys">
        <div className="sk-left">
          {isSearchingInText ? 'Done' : (isSearching ? 'Done' : (view === 'menu' ? 'Search' : 'Back'))}
        </div>
        <div className="sk-center">
          {(!isSearching && !isSearchingInText && !showOptions && view === 'menu' && filteredItems.length > 0) ? 'SELECT' : ''}
          {(showOptions || isSearchingInText) ? 'SELECT' : ''}
        </div>
        <div className="sk-right">
          {(!isSearching && !isSearchingInText && view === 'details') ? (showOptions ? 'Close' : 'Options') : ''}
        </div>
      </footer>
    </div>
  );
}
