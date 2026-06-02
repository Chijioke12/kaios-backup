import './index.css';
import { showInterstitial } from './ads';

// --- Types ---
interface ArchiveFile {
  name: string;
  format: string;
  size?: string;
}

interface ArchiveItem {
  identifier: string;
  title: string;
  creator?: string;
  date?: string;
  mediatype?: string;
  description?: string | string[];
  files?: ArchiveFile[];
}

type ViewState = 'search' | 'list' | 'detail' | 'filter' | 'files';

// --- State ---
const state = {
  view: 'search' as ViewState,
  query: '',
  mediaType: 'all',
  results: [] as ArchiveItem[],
  selectedItem: null as ArchiveItem | null,
  fileIndex: 0,
  focusedIndex: 0,
  filterIndex: 0,
  loading: false,
  error: null as string | null,
};

const MEDIA_TYPES = [
  { id: 'all', label: 'All Media' },
  { id: 'texts', label: 'Texts/Books' },
  { id: 'movies', label: 'Movies/Videos' },
  { id: 'audio', label: 'Audio/Music' },
  { id: 'software', label: 'Software' },
  { id: 'image', label: 'Images' },
];

const SEARCH_API = 'https://archive.org/advancedsearch.php';
const METADATA_API = 'https://archive.org/metadata';

let appContainer: HTMLElement;

// --- Actions ---
async function performSearch() {
  if (!state.query.trim()) return;
  state.loading = true;
  state.error = null;
  render();

  try {
    let q = state.query;
    if (state.mediaType !== 'all') {
      q += ` AND mediatype:${state.mediaType}`;
    }

    const params = new URLSearchParams({
      q: q,
      output: 'json',
      rows: '20',
      fl: 'identifier,title,creator,date,mediatype,description',
    });
    const response = await fetch(`${SEARCH_API}?${params.toString()}`);
    const data = await response.json();
    
    if (data.response && data.response.docs && data.response.docs.length > 0) {
      state.results = data.response.docs;
      state.view = 'list';
      state.focusedIndex = 0;
    } else {
      state.results = [];
      state.error = 'No results found.';
    }
  } catch (err) {
    state.error = 'Failed to fetch results.';
    console.error(err);
  } finally {
    state.loading = false;
    render();
  }
}

async function fetchDetails(identifier: string) {
  state.loading = true;
  render();
  try {
    const response = await fetch(`${METADATA_API}/${identifier}`);
    const data = await response.json();
    state.selectedItem = {
      ...data.metadata,
      identifier,
      files: data.files || [],
    };
    state.view = 'detail';
  } catch (err) {
    state.error = 'Failed to fetch details.';
    console.error(err);
  } finally {
    state.loading = false;
    render();
    scrollToTop();
  }
}

// --- Navigation & Keyboard ---
function handleKeyDown(e: KeyboardEvent) {
  const key = e.key;
  switch (key) {
    case 'ArrowDown':
      if (state.view === 'list') {
        state.focusedIndex = Math.min(state.focusedIndex + 1, state.results.length - 1);
        render();
      } else if (state.view === 'filter') {
        state.filterIndex = Math.min(state.filterIndex + 1, MEDIA_TYPES.length - 1);
        render();
      } else if (state.view === 'files' && state.selectedItem?.files) {
        const validFiles = state.selectedItem.files.filter(f => !f.name.startsWith('__'));
        state.fileIndex = Math.min(state.fileIndex + 1, validFiles.length - 1);
        render();
      } else if (state.view === 'detail') {
        scrollContentBy(50);
      }
      break;
    case 'ArrowUp':
      if (state.view === 'list') {
        state.focusedIndex = Math.max(state.focusedIndex - 1, 0);
        render();
      } else if (state.view === 'filter') {
        state.filterIndex = Math.max(state.filterIndex - 1, 0);
        render();
      } else if (state.view === 'files') {
        state.fileIndex = Math.max(state.fileIndex - 1, 0);
        render();
      } else if (state.view === 'detail') {
        scrollContentBy(-50);
      }
      break;
    case 'Enter':
      if (state.view === 'search') {
        performSearch();
      } else if (state.view === 'list' && state.results[state.focusedIndex]) {
        fetchDetails(state.results[state.focusedIndex].identifier);
      } else if (state.view === 'filter') {
        state.mediaType = MEDIA_TYPES[state.filterIndex].id;
        state.view = 'search';
        render();
      } else if (state.view === 'files' && state.selectedItem?.files) {
        const validFiles = state.selectedItem.files.filter(f => !f.name.startsWith('__'));
        if (validFiles[state.fileIndex]) {
          // Show ad before downloading (helps monetization)
          showInterstitial(() => {
            window.open(`https://archive.org/download/${state.selectedItem.identifier}/${validFiles[state.fileIndex].name}`, '_blank');
          });
        }
      }
      break;
    case 'SoftLeft':
    case 'F1':
    case 'Backspace':
    case 'Escape':
      if (state.view === 'detail') {
        state.view = 'list';
        e.preventDefault();
        render();
      } else if (state.view === 'files') {
        state.view = 'detail';
        e.preventDefault();
        render();
      } else if (state.view === 'list') {
        // Show an ad when exiting list back to search
        showInterstitial(() => {
          state.view = 'search';
          e.preventDefault();
          render();
        });
      } else if (state.view === 'filter') {
        state.view = 'search';
        e.preventDefault();
        render();
      }
      break;
    case 'SoftRight':
    case 'F2':
      if (state.view === 'detail' && state.selectedItem) {
        state.view = 'files';
        state.fileIndex = 0;
        render();
      } else if (state.view === 'search') {
        state.view = 'filter';
        state.filterIndex = MEDIA_TYPES.findIndex(m => m.id === state.mediaType);
        if (state.filterIndex === -1) state.filterIndex = 0;
        render();
      }
      break;
  }
}

function scrollContentBy(amount: number) {
  const content = appContainer.querySelector('.content');
  if (content) {
    content.scrollTop += amount;
  }
}

function scrollToTop() {
  const content = appContainer.querySelector('.content');
  if (content) content.scrollTop = 0;
}

function scrollToFocused() {
  const content = appContainer.querySelector('.content');
  const focused = appContainer.querySelector('.focused') as HTMLElement;
  if (content && focused) {
    const elementTop = focused.offsetTop;
    const elementHeight = focused.offsetHeight;
    const containerHeight = content.clientHeight;
    const targetScrollPos = elementTop - (containerHeight / 2) + (elementHeight / 2);
    content.scrollTop = targetScrollPos;
  }
}

// --- Render ---
function render() {
  let headerText = '';
  let softLeft = '';
  let softCenter = '';
  let softRight = '';
  let contentHtml = '';

  if (state.loading) {
    contentHtml = `<div class="center-msg"><div class="spinner"></div><p>Loading...</p></div>`;
  } else if (state.error) {
    contentHtml = `<div class="center-msg error">${state.error}</div>`;
  } else {
    switch (state.view) {
      case 'search':
        headerText = 'Archive Search';
        softCenter = 'SEARCH';
        softRight = 'Filter';
        const currentFilterLabel = MEDIA_TYPES.find(m => m.id === state.mediaType)?.label || 'All Media';
        contentHtml = `
          <div class="search-view">
            <p class="md-body-small text-variant">Search the Internet Archive for books, movies, music, and more.</p>
            <div class="filter-chip">
              <span class="md-label-small">Filter:</span>
              <span class="md-label-large text-primary">${currentFilterLabel}</span>
            </div>
            <input type="text" id="search-input" class="md-input" placeholder="Enter keywords..." value="${state.query}">
          </div>
        `;
        break;
      case 'filter':
        headerText = 'Select Filter';
        softLeft = 'Back';
        softCenter = 'SELECT';
        contentHtml = `<div class="list-view">` + MEDIA_TYPES.map((type, i) => `
          <div class="md-list-item ${state.filterIndex === i ? 'focused' : ''}">
            <span class="md-body-large">${type.label}</span>
            ${state.mediaType === type.id ? '<span class="md-icon">✓</span>' : ''}
          </div>
        `).join('') + `</div>`;
        break;
      case 'list':
        headerText = 'Search Results';
        softLeft = 'Back';
        softCenter = 'SELECT';
        if (state.results.length === 0) {
          contentHtml = `<div class="center-msg">No results found.</div>`;
        } else {
          contentHtml = `<div class="list-view">` + state.results.map((item, i) => `
            <div class="md-list-item ${state.focusedIndex === i ? 'focused' : ''}">
              <img src="https://archive.org/services/img/${item.identifier}" class="md-avatar" onerror="this.style.display='none'" referrerpolicy="no-referrer">
              <div class="md-list-item-content">
                <span class="md-title-medium truncate">${item.title || 'Untitled'}</span>
                <span class="md-body-small text-variant truncate">${item.mediatype} • ${item.date?.substring(0, 4) || 'N/A'}</span>
              </div>
            </div>
          `).join('') + `</div>`;
        }
        break;
      case 'detail':
        headerText = 'Item Details';
        softLeft = 'Back';
        softRight = 'Files';
        if (state.selectedItem) {
          const desc = Array.isArray(state.selectedItem.description) 
            ? state.selectedItem.description.join(' ') 
            : String(state.selectedItem.description || 'No description available.');
          const shortDesc = desc.substring(0, 500) + (desc.length > 500 ? '...' : '');
          
          contentHtml = `
            <div class="detail-view">
              <div class="detail-image-container">
                <img src="https://archive.org/services/img/${state.selectedItem.identifier}" class="detail-image" referrerpolicy="no-referrer">
              </div>
              <h2 class="md-title-large text-primary">${state.selectedItem.title}</h2>
              <div class="detail-meta">
                <p class="md-body-medium"><strong>Creator:</strong> ${state.selectedItem.creator || 'Unknown'}</p>
                <p class="md-body-medium"><strong>Date:</strong> ${state.selectedItem.date || 'Unknown'}</p>
                <p class="md-body-medium"><strong>Type:</strong> ${state.selectedItem.mediatype}</p>
              </div>
              <div class="md-body-medium detail-desc">${shortDesc}</div>
            </div>
          `;
        }
        break;
      case 'files':
        headerText = 'Download Files';
        softLeft = 'Back';
        softCenter = 'DOWNLOAD';
        if (state.selectedItem && state.selectedItem.files) {
          const validFiles = state.selectedItem.files.filter(f => !f.name.startsWith('__'));
          contentHtml = `<div class="list-view">` + validFiles.map((file, i) => `
            <div class="md-list-item ${state.fileIndex === i ? 'focused' : ''}">
              <div class="md-list-item-content">
                <span class="md-title-medium truncate">${file.name}</span>
                <span class="md-body-small text-variant truncate">${file.format} ${file.size ? `• ${Math.round(parseInt(file.size) / 1024 / 1024 * 10) / 10} MB` : ''}</span>
              </div>
            </div>
          `).join('') + `</div>`;
        }
        break;
    }
  }

  appContainer.innerHTML = `
    <header class="md-top-app-bar">
      <span class="md-title-large truncate">${headerText}</span>
    </header>
    <main class="content">
      ${contentHtml}
    </main>
    <footer class="md-bottom-bar">
      <div class="softkey left truncate">${softLeft}</div>
      <div class="softkey center truncate">${softCenter}</div>
      <div class="softkey right truncate">${softRight}</div>
    </footer>
  `;

  // Attach event listeners for inputs
  if (state.view === 'search') {
    const input = document.getElementById('search-input') as HTMLInputElement;
    if (input) {
      input.addEventListener('input', (e) => {
        state.query = (e.target as HTMLInputElement).value;
      });
      input.focus();
      // Move cursor to end
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }

  scrollToFocused();
}

// --- Initialization ---
export function init() {
  const root = document.getElementById('app')!;
  if (import.meta.env.PROD) {
    appContainer = document.createElement('div');
    appContainer.className = 'app-container';
    root.appendChild(appContainer);
  } else {
    root.innerHTML = `
      <div class="simulator-wrapper">
        <svg class="kaios-simulator" viewBox="0 0 320 640" xmlns="http://www.w3.org/2000/svg">
          <rect x="10" y="10" width="300" height="620" rx="40" fill="#1a1a1a" />
          <rect x="15" y="15" width="290" height="610" rx="35" fill="#2a2a2a" />
          <rect x="40" y="60" width="240" height="320" fill="#000" />
          <foreignObject x="40" y="60" width="240" height="320">
            <div class="simulator-screen">
              <div class="app-container" id="inner-app-container"></div>
            </div>
          </foreignObject>
          <rect class="simulator-button" x="40" y="400" width="70" height="30" rx="5" fill="#444" id="btn-softleft" />
          <rect class="simulator-button" x="210" y="400" width="70" height="30" rx="5" fill="#444" id="btn-softright" />
          <circle cx="160" cy="450" r="50" fill="#333" />
          <path class="simulator-button" d="M160 410 L180 430 L140 430 Z" fill="#555" id="btn-up" />
          <path class="simulator-button" d="M160 490 L180 470 L140 470 Z" fill="#555" id="btn-down" />
          <path class="simulator-button" d="M120 450 L140 430 L140 470 Z" fill="#555" id="btn-left" />
          <path class="simulator-button" d="M200 450 L180 430 L180 470 Z" fill="#555" id="btn-right" />
          <circle class="simulator-button" cx="160" cy="450" r="20" fill="#ff4e00" id="btn-enter" />
          <rect class="simulator-button" x="40" y="440" width="60" height="30" rx="15" fill="#2e7d32" id="btn-call" />
          <rect class="simulator-button" x="220" y="440" width="60" height="30" rx="15" fill="#c62828" id="btn-end" />
        </svg>
      </div>
    `;
    appContainer = document.getElementById('inner-app-container')!;
    
    const bindKey = (id: string, key: string) => {
      document.getElementById(id)?.addEventListener('click', () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key }));
      });
    };
    bindKey('btn-softleft', 'SoftLeft');
    bindKey('btn-softright', 'SoftRight');
    bindKey('btn-up', 'ArrowUp');
    bindKey('btn-down', 'ArrowDown');
    bindKey('btn-left', 'ArrowLeft');
    bindKey('btn-right', 'ArrowRight');
    bindKey('btn-enter', 'Enter');
    bindKey('btn-call', 'Enter');
    bindKey('btn-end', 'Backspace');
  }

  window.addEventListener('keydown', handleKeyDown);
  render();
}

init();
