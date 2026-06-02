// STATE
var state = {
  view: 'LIBRARY',
  videos: [],
  filteredVideos: [],
  index: 0,
  menuIndex: 0,
  searchQuery: '',
  // Player
  isPlaying: false,
  isMuted: false,
  isLandscape: false,
  volume: 1.0,
  zoom: 1.0,
  speed: 1.0,
  brightness: 1.0, // 0.1 to 1.0
  loop: false,
  duration: 0,
  currentTime: 0,
  jumpInput: '',
  // Overlays
  activeOverlay: null,
  resumeTime: 0,
  videoToResume: null
};

// DOM ELEMENTS
var els = {
  app: document.getElementById('app-container'),
  header: document.getElementById('header'),
  headerTitle: document.getElementById('header-title'),
  viewLibrary: document.getElementById('view-library'),
  viewSearch: document.getElementById('view-search'),
  viewPlayer: document.getElementById('view-player'),
  videoList: document.getElementById('video-list'),
  searchResults: document.getElementById('search-results'),
  searchInput: document.getElementById('search-input'),
  video: document.getElementById('main-video'),
  playerContainer: document.getElementById('player-container'),
  playerControls: document.getElementById('player-controls'),
  playerHeader: document.getElementById('player-header'),
  brightOverlay: document.getElementById('brightness-overlay'),
  toast: document.getElementById('toast'),
  softkeys: document.querySelector('.softkeys'),
  skLeft: document.getElementById('sk-left'),
  skCenter: document.getElementById('sk-center'),
  skRight: document.getElementById('sk-right'),
  // Player UI
  pFilename: document.getElementById('player-filename'),
  pMuted: document.getElementById('player-muted-icon'),
  pTimeCur: document.getElementById('time-current'),
  pTimeDur: document.getElementById('time-duration'),
  pProgress: document.getElementById('progress-fill'),
  pStatus: document.getElementById('status-text'),
  pFeedback: document.getElementById('player-feedback'),
  pFbText: document.getElementById('feedback-text'),
  pFbBar: document.getElementById('feedback-bar-container'),
  pFbFill: document.getElementById('feedback-bar-fill'),
  // Overlays
  menuLib: document.getElementById('menu-library'),
  listMenuLib: document.getElementById('list-menu-library'),
  menuOpt: document.getElementById('menu-options'),
  listMenuOpt: document.getElementById('list-menu-options'),
  dialogResume: document.getElementById('dialog-resume'),
  resumeTimeText: document.getElementById('resume-time'),
  dialogJump: document.getElementById('dialog-jumpto'),
  jumpText: document.getElementById('jumpto-text'),
  dialogInfo: document.getElementById('dialog-info'),
  infoScroll: document.getElementById('info-scroll-area'),
  infoName: document.getElementById('info-name'),
  infoDuration: document.getElementById('info-duration'),
  infoRes: document.getElementById('info-res'),
  dialogShortcuts: document.getElementById('dialog-shortcuts')
};

var TIMEOUTS = { controls: null, feedback: null, toast: null };
