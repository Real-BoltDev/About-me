/* ============================================================
   js/discord.js — Real-time Discord presence via Lanyard API
   ============================================================ */
'use strict';

class DiscordPresence {
  constructor(options = {}) {
    // --- IMPORTANT ---
    // Replace with your own Discord User ID.
    // To find your ID, enable Developer Mode in Discord,
    // right-click your profile, and "Copy User ID".
    this.discordId = '1181986720221253666'; // Using Phineas's ID as a placeholder

    this.opts = {
      el: '#discord-presence',
      ...options
    };

    this.el = DOM.qs(this.opts.el);
    if (!this.el) return;

    // DOM elements
    this.avatarEl = DOM.qs('#discord-avatar', this.el);
    this.statusIndicatorEl = DOM.qs('#discord-status-indicator', this.el);
    this.usernameEl = DOM.qs('#discord-username', this.el);
    this.badgesEl = DOM.qs('#discord-badges', this.el);
    this.activityEl = DOM.qs('#discord-activity', this.el);

    this.socket = null;
    this.heartbeatInterval = null;
    this.spotifyLoopId = null;
    this.spotify = null;

    this._init();
  }

  _init() {
    // The card is inside the contact section, which is animated on scroll.
    // To prevent this card from animating while its parent is invisible,
    // we'll tie its reveal animation to a ScrollTrigger. This ensures it
    // only animates in when the user actually scrolls to it.
    gsap.fromTo(this.el,
      { y: 20, autoAlpha: 0 }, // from state
      { // to state
        y: 0,
        autoAlpha: 1,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: this.el,
          start: 'top 90%', // Animate when top of card is 90% from viewport top
          toggleActions: 'play none none none',
        }
      }
    );
    this.connect();
  }

  connect() {
    this.socket = new WebSocket('wss://api.lanyard.rest/socket');

    this.socket.addEventListener('open', () => {
      this.socket.send(JSON.stringify({ op: 2, d: { subscribe_to_id: this.discordId } }));
    });

    this.socket.addEventListener('message', event => {
      const data = JSON.parse(event.data);

      if (data.op === 1) { // Opcode 1: Hello
        this.heartbeatInterval = setInterval(() => {
          this.socket.send(JSON.stringify({ op: 3 }));
        }, data.d.heartbeat_interval);
      } else if (data.op === 0) { // Opcode 0: Event
        if (['INIT_STATE', 'PRESENCE_UPDATE'].includes(data.t)) {
          this._update(data.d);
        }
      }
    });

    this.socket.addEventListener('close', () => {
      clearInterval(this.heartbeatInterval);
      setTimeout(() => this.connect(), 5000); // Reconnect after 5s
    });
  }

  _update(data) {
    if (!data || !data.discord_user) return;

    // Update avatar
    const avatarHash = data.discord_user.avatar;
    const avatarUrl = `https://cdn.discordapp.com/avatars/${this.discordId}/${avatarHash}.${avatarHash.startsWith('a_') ? 'gif' : 'png'}?size=128`;
    if (this.avatarEl.src !== avatarUrl) this.avatarEl.src = avatarUrl;

    // Update username
    this.usernameEl.textContent = `${data.discord_user.username}`;

    // Update status
    this.statusIndicatorEl.className = 'discord-status'; // Reset
    DOM.addClass(this.statusIndicatorEl, data.discord_status);

    this._updateBadges(data.discord_user.public_flags);
    this._updateActivity(data);
  }

  _updateActivity(data) {
    const activity = data.activities.find(a => a.type !== 4 && a.type !== 2); // Exclude custom status and Spotify

    // Lanyard has a dedicated `spotify` object if listening. Prioritize this.
    if (data.spotify) {
      this.activityEl.style.display = 'flex';
      this.spotify = data.spotify;
      const spotify = data.spotify;
      const html = `
        <img src="${spotify.album_art_url}" alt="${spotify.album}" class="discord-activity-cover">
        <div class="discord-activity-details">
          <strong>${spotify.song}</strong>
          <span>by ${spotify.artist}</span>
          <span>on ${spotify.album}</span>
          <div class="discord-spotify-progress">
            <div class="discord-spotify-bar">
              <div id="spotify-progress-bar" class="discord-spotify-bar-inner"></div>
            </div>
            <div class="discord-spotify-times">
              <span id="spotify-time-current">0:00</span>
              <span id="spotify-time-total">0:00</span>
            </div>
          </div>
        </div>`;
      this.activityEl.innerHTML = html;
      this._startSpotifyLoop();
    } else if (activity) {
      // If not on spotify, but doing something else
      this._stopSpotifyLoop();
      this.spotify = null;
      this.activityEl.style.display = 'flex';
      let cover = '';
      if (activity.assets && activity.assets.large_image) {
        const assetId = activity.assets.large_image;
        cover = `<img src="https://cdn.discordapp.com/app-assets/${activity.application_id}/${assetId}.png" alt="${activity.name}" class="discord-activity-cover">`;
      }
      const html = `
        ${cover}
        <div class="discord-activity-details">
          <strong>${activity.name}</strong>
          <span>${activity.details || ''}</span>
          <span>${activity.state || ''}</span>
        </div>`;
      this.activityEl.innerHTML = html;
    } else {
      // No activity
      this._stopSpotifyLoop();
      this.spotify = null;
      this.activityEl.style.display = 'none';
    }
  }

  _updateBadges(flags) {
    const badgeNameMap = {
      1: 'Discord Staff',
      2: 'Partnered Server Owner',
      4: 'HypeSquad Events',
      8: 'Bug Hunter Level 1',
      64: 'HypeSquad Bravery',
      128: 'HypeSquad Brilliance',
      256: 'HypeSquad Balance',
      512: 'Early Supporter',
      16384: 'Bug Hunter Level 2',
      131072: 'Verified Bot Developer',
      262144: 'Discord Certified Moderator',
      4194304: 'Active Developer'
    };
    const badgeMap = {
      1: 'https://raw.githubusercontent.com/Lanyard-Projects/lanyard/main/public/images/badges/staff.svg',
      2: 'https://raw.githubusercontent.com/Lanyard-Projects/lanyard/main/public/images/badges/partner.svg',
      4: 'https://raw.githubusercontent.com/Lanyard-Projects/lanyard/main/public/images/badges/hypesquad.svg',
      8: 'https://raw.githubusercontent.com/Lanyard-Projects/lanyard/main/public/images/badges/bug_hunter_level_1.svg',
      64: 'https://raw.githubusercontent.com/Lanyard-Projects/lanyard/main/public/images/badges/hypesquad_bravery.svg',
      128: 'https://raw.githubusercontent.com/Lanyard-Projects/lanyard/main/public/images/badges/hypesquad_brilliance.svg',
      256: 'https://raw.githubusercontent.com/Lanyard-Projects/lanyard/main/public/images/badges/hypesquad_balance.svg',
      512: 'https://raw.githubusercontent.com/Lanyard-Projects/lanyard/main/public/images/badges/early_supporter.svg',
      16384: 'https://raw.githubusercontent.com/Lanyard-Projects/lanyard/main/public/images/badges/bug_hunter_level_2.svg',
      131072: 'https://raw.githubusercontent.com/Lanyard-Projects/lanyard/main/public/images/badges/verified_developer.svg',
      262144: 'https://raw.githubusercontent.com/Lanyard-Projects/lanyard/main/public/images/badges/moderator_programs_alumni.svg',
      4194304: 'https://raw.githubusercontent.com/Lanyard-Projects/lanyard/main/public/images/badges/active_developer.svg'
    };

    this.badgesEl.innerHTML = '';
    for (const flag in badgeMap) {
      // Use bitwise AND to check if the user has this flag
      if ((flags & flag) == flag) {
        const badgeEl = document.createElement('div');
        badgeEl.className = 'discord-badge';
        badgeEl.style.backgroundImage = `url(${badgeMap[flag]})`;
        badgeEl.title = badgeNameMap[flag] || 'Discord Badge'; // Add tooltip
        this.badgesEl.appendChild(badgeEl);
      }
    }
  }

  _startSpotifyLoop() {
    this._stopSpotifyLoop(); // Prevent multiple loops
    this.spotifyLoopId = 'spotify-progress';
    Raf.add(this.spotifyLoopId, () => this._updateSpotifyProgress());
  }

  _stopSpotifyLoop() {
    if (this.spotifyLoopId) {
      Raf.remove(this.spotifyLoopId);
      this.spotifyLoopId = null;
    }
  }

  _updateSpotifyProgress() {
    if (!this.spotify || !this.spotify.timestamps) {
      this._stopSpotifyLoop();
      return;
    }

    const start = this.spotify.timestamps.start;
    const end = this.spotify.timestamps.end;
    const now = Date.now();

    const totalDuration = end - start;
    const currentProgress = now - start;
    const progressPercent = Math.min(currentProgress / totalDuration, 1);

    const bar = DOM.qs('#spotify-progress-bar');
    const currentTimeEl = DOM.qs('#spotify-time-current');
    const totalTimeEl = DOM.qs('#spotify-time-total');

    if (bar) bar.style.width = `${progressPercent * 100}%`;
    if (currentTimeEl) currentTimeEl.textContent = this._formatTime(currentProgress);
    if (totalTimeEl) totalTimeEl.textContent = this._formatTime(totalDuration);

    // If song finished, wait a moment then stop (Lanyard will send update)
    if (progressPercent >= 1) {
      setTimeout(() => this._stopSpotifyLoop(), 1000);
    }
  }

  _formatTime(ms) {
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

window.DiscordPresence = DiscordPresence;