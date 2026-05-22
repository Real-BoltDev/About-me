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
    this.bannerEl = DOM.qs('#discord-banner', this.el);
    this.avatarEl = DOM.qs('#discord-avatar', this.el);
    this.statusIndicatorEl = DOM.qs('#discord-status-indicator', this.el);
    this.displayNameEl = DOM.qs('#discord-display-name', this.el);
    this.usernameEl = DOM.qs('#discord-username', this.el);
    this.badgesEl = DOM.qs('#discord-badges', this.el);
    this.customStatusEl = DOM.qs('#discord-custom-status', this.el);
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

    // Update banner
    if (this.bannerEl) {
      if (data.discord_user.banner) {
        const isGif = data.discord_user.banner.startsWith('a_');
        const bannerUrl = `https://cdn.discordapp.com/banners/${this.discordId}/${data.discord_user.banner}.${isGif ? 'gif' : 'png'}?size=480`;
        this.bannerEl.style.backgroundImage = `url(${bannerUrl})`;
        this.bannerEl.style.backgroundColor = '';
      } else if (data.discord_user.accent_color) {
        const hexColor = '#' + data.discord_user.accent_color.toString(16).padStart(6, '0');
        this.bannerEl.style.backgroundImage = '';
        this.bannerEl.style.backgroundColor = hexColor;
      } else {
        this.bannerEl.style.backgroundImage = '';
        this.bannerEl.style.backgroundColor = ''; // CSS gradient takes over
      }
    }

    // Update avatar
    const avatarHash = data.discord_user.avatar;
    if (avatarHash) {
      const isGif = avatarHash.startsWith('a_');
      const avatarUrl = `https://cdn.discordapp.com/avatars/${this.discordId}/${avatarHash}.${isGif ? 'gif' : 'png'}?size=128`;
      if (this.avatarEl.src !== avatarUrl) this.avatarEl.src = avatarUrl;
    } else {
      const defaultAvatarNum = parseInt(data.discord_user.discriminator || '0') % 5;
      const avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNum}.png`;
      if (this.avatarEl.src !== avatarUrl) this.avatarEl.src = avatarUrl;
    }

    // Update username & display name
    if (this.displayNameEl) {
      this.displayNameEl.textContent = data.discord_user.global_name || data.discord_user.username;
    }
    this.usernameEl.textContent = `@${data.discord_user.username}`;

    // Update status
    this.statusIndicatorEl.className = 'discord-status'; // Reset
    DOM.addClass(this.statusIndicatorEl, data.discord_status);

    this._updateBadges(data.discord_user.public_flags);
    this._updateCustomStatus(data);
    this._updateActivity(data);
  }

  _updateCustomStatus(data) {
    if (!this.customStatusEl) return;
    const customStatus = data.activities.find(a => a.type === 4);
    
    if (customStatus) {
      this.customStatusEl.style.display = 'flex';
      let statusHtml = '';
      if (customStatus.emoji) {
        if (customStatus.emoji.id) {
          const isAnimated = customStatus.emoji.animated;
          statusHtml += `<img src="https://cdn.discordapp.com/emojis/${customStatus.emoji.id}.${isAnimated ? 'gif' : 'png'}?size=32" alt="${customStatus.emoji.name}" class="discord-status-emoji">`;
        } else if (customStatus.emoji.name) {
          statusHtml += `<span class="discord-status-emoji">${customStatus.emoji.name}</span>`;
        }
      }
      if (customStatus.state) {
        statusHtml += `<span class="discord-status-text">${customStatus.state}</span>`;
      }
      this.customStatusEl.innerHTML = statusHtml;
    } else {
      this.customStatusEl.style.display = 'none';
      this.customStatusEl.innerHTML = '';
    }
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
        if (assetId.startsWith('mp:external/')) {
          cover = `<img src="https://media.discordapp.net/${assetId.replace('mp:', '')}" alt="${activity.name}" class="discord-activity-cover">`;
        } else {
          cover = `<img src="https://cdn.discordapp.com/app-assets/${activity.application_id}/${assetId}.png" alt="${activity.name}" class="discord-activity-cover">`;
        }
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
      1: 'https://cdn.jsdelivr.net/gh/merlinfuchs/discord-badges/SVG/staff.svg',
      2: 'https://cdn.jsdelivr.net/gh/merlinfuchs/discord-badges/SVG/partner.svg',
      4: 'https://cdn.jsdelivr.net/gh/merlinfuchs/discord-badges/SVG/hypesquad.svg',
      8: 'https://cdn.jsdelivr.net/gh/merlinfuchs/discord-badges/SVG/bug_hunter_level_1.svg',
      64: 'https://cdn.jsdelivr.net/gh/merlinfuchs/discord-badges/SVG/hypesquad_bravery.svg',
      128: 'https://cdn.jsdelivr.net/gh/merlinfuchs/discord-badges/SVG/hypesquad_brilliance.svg',
      256: 'https://cdn.jsdelivr.net/gh/merlinfuchs/discord-badges/SVG/hypesquad_balance.svg',
      512: 'https://cdn.jsdelivr.net/gh/merlinfuchs/discord-badges/SVG/early_supporter.svg',
      16384: 'https://cdn.jsdelivr.net/gh/merlinfuchs/discord-badges/SVG/bug_hunter_level_2.svg',
      131072: 'https://cdn.jsdelivr.net/gh/merlinfuchs/discord-badges/SVG/verified_developer.svg',
      262144: 'https://cdn.jsdelivr.net/gh/merlinfuchs/discord-badges/SVG/certified_moderator.svg',
      4194304: 'https://cdn.jsdelivr.net/gh/merlinfuchs/discord-badges/SVG/active_developer.svg'
    };

    this.badgesEl.innerHTML = '';
    for (const flag in badgeMap) {
      if ((flags & flag) == flag) {
        const badgeEl = document.createElement('div');
        badgeEl.className = 'discord-badge';
        badgeEl.style.backgroundImage = `url(${badgeMap[flag]})`;
        badgeEl.title = badgeNameMap[flag] || 'Discord Badge';
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