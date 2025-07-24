document.addEventListener('DOMContentLoaded', () => {
    const scheduleContainer = document.getElementById('schedule-container');
    const errorMessageDiv = document.getElementById('error-message');
    const loadingSpinner = document.getElementById('loading-spinner');
    const sportFilter = document.getElementById('sport-filter');
    const tournamentFilter = document.getElementById('tournament-filter');
    const sortByDropdown = document.getElementById('sort-by');
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const apiUrl = 'https://topembed.pw/api.php?format=json';
    const playerContainer = document.getElementById('player-container');
    const channelUrl = new URLSearchParams(window.location.search).get('channel');
    const channelUrl = urlParams.get('channel');

    let allMatchesData = [];

    const getMatchStatus = match => {
        const start = match.unix_timestamp * 1000;
        const now = Date.now();
        const before = start - 30 * 60 * 1000;
        const after = start + 2.5 * 60 * 60 * 1000;

        if (now >= start && now < after) return 'Live Now';
        if (now >= before && now < start) return 'Upcoming';
        if (now >= after) return 'Finished';
        return null;
    };

    const getStatusPriority = status => {
        return { 'Live Now': 1, 'Upcoming': 2, 'Finished': 3 }[status] || 4;
    };

    const shouldDismissMatch = match => {
        const end = match.unix_timestamp * 1000 + 3 * 60 * 60 * 1000;
        return Date.now() > end;
    };

    const renderMatches = matches => {
        scheduleContainer.innerHTML = '';
        const validMatches = matches.filter(m => !shouldDismissMatch(m));

        if (validMatches.length === 0) {
            scheduleContainer.innerHTML = `<p class="text-center text-gray-600 dark:text-gray-400">No upcoming matches found for the selected filters.</p>`;
            return;
        }

        const sortBy = sortByDropdown.value;

        if (sortBy === 'default') {
            const grouped = new Map();
            validMatches.forEach(match => {
                if (!grouped.has(match.rawDate)) grouped.set(match.rawDate, []);
                grouped.get(match.rawDate).push(match);
            });

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);

            Array.from(grouped.keys()).sort().forEach(dateKey => {
                const matchesForDate = grouped.get(dateKey);
                const matchDate = new Date(dateKey);
                matchDate.setHours(0, 0, 0, 0);

                let headingText = dateKey;
                if (matchDate.getTime() === today.getTime()) headingText = 'Today';
                else if (matchDate.getTime() === tomorrow.getTime()) headingText = 'Tomorrow';
                else headingText = matchDate.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' });

                const heading = document.createElement('h2');
                heading.className = 'text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-200 mt-8 mb-4 col-span-full text-center';
                heading.textContent = headingText;

                const grid = document.createElement('div');
                grid.className = 'grid grid-cols-1 md:grid-cols-2 gap-6 col-span-full';

                matchesForDate.forEach(match => grid.appendChild(createMatchCard(match)));

                scheduleContainer.appendChild(heading);
                scheduleContainer.appendChild(grid);
            });
        } else {
            validMatches.forEach(match => {
                scheduleContainer.appendChild(createMatchCard(match));
            });
        }
    };

    const createMatchCard = match => {
        const card = document.createElement('div');
        card.className = 'card';

        const status = getMatchStatus(match);
        const labelClass = {
            'Live Now': 'live-now',
            'Upcoming': 'upcoming',
            'Finished': 'finished'
        }[status] || '';

        const statusLabel = status
            ? `<span class="status-label ${labelClass}">${status}</span>`
            : '';

        const matchDateTime = new Date(match.unix_timestamp * 1000);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        let displayDate = match.date;
        const matchDay = new Date(match.unix_timestamp * 1000);
        matchDay.setHours(0, 0, 0, 0);
        if (matchDay.getTime() === today.getTime()) displayDate = 'Today';
        else if (matchDay.getTime() === tomorrow.getTime()) displayDate = 'Tomorrow';

        const dateTimeText = `${displayDate} | ${match.time}`;
        const embedUrl = match.link ? `embed.html?channel=${encodeURIComponent(match.link)}` : null;

        let actionHtml = '';
        if (embedUrl && (status === 'Live Now' || status === 'Upcoming')) {
            actionHtml = `<a href="${embedUrl}" target="_blank" class="live-link">Watch Live</a>`;
        } else if (status === 'Finished') {
            actionHtml = `<p class="text-gray-500 text-sm dark:text-gray-400">Game is completed.</p>`;
        } else {
            actionHtml = `<p class="text-gray-500 text-sm dark:text-gray-400">Live available 30' prior to the game.</p>`;
        }

        card.innerHTML = `
            ${statusLabel}
            <div class="flex flex-col flex-grow">
                <div class="flex flex-col sm:flex-row items-center justify-between mb-4">
                    <div class="text-center sm:text-left mb-2 sm:mb-0">
                        <p class="text-lg team-name">${match.team1} <span class="text-gray-500 dark:text-gray-400">vs</span> ${match.team2}</p>
                        <p class="match-info text-gray-600 dark:text-gray-400">${match.league}</p>
                        <p class="match-info text-gray-500 dark:text-gray-400">${dateTimeText}</p>
                    </div>
                    <div></div>
                </div>
                <div class="text-center sm:text-right mt-auto">
                    ${actionHtml}
                </div>
            </div>
        `;
        return card;
    };

    const applyFilters = () => {
        const sport = sportFilter.value;
        const tournament = tournamentFilter.value;
        const sortBy = sortByDropdown.value;

        let filtered = allMatchesData.filter(match => {
            const matchSport = sport === 'all' || match.sport === sport;
            const matchTournament = tournament === 'all' || match.league === tournament;
            return matchSport && matchTournament;
        });

        if (sortBy === 'status') {
            filtered.sort((a, b) => {
                const priorityA = getStatusPriority(getMatchStatus(a));
                const priorityB = getStatusPriority(getMatchStatus(b));
                return priorityA !== priorityB
                    ? priorityA - priorityB
                    : a.unix_timestamp - b.unix_timestamp;
            });
        } else {
            filtered.sort((a, b) => a.unix_timestamp - b.unix_timestamp);
        }

        renderMatches(filtered);
    };

    const populateFilters = matches => {
        const sports = new Set();
        const tournaments = new Set();

        matches.forEach(match => {
            sports.add(match.sport);
            tournaments.add(match.league);
        });

        sportFilter.innerHTML = '<option value="all">All Sports</option>';
        tournamentFilter.innerHTML = '<option value="all">All Tournaments</option>';

        Array.from(sports).sort().forEach(sport => {
            sportFilter.innerHTML += `<option value="${sport}">${sport}</option>`;
        });
        Array.from(tournaments).sort().forEach(tournament => {
            tournamentFilter.innerHTML += `<option value="${tournament}">${tournament}</option>`;
        });
    };

    const fetchAndDisplaySchedule = async () => {
        loadingSpinner.classList.remove('hidden');
        errorMessageDiv.classList.add('hidden');
        scheduleContainer.innerHTML = '';

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            const tempMatches = [];

            if (data?.events && typeof data.events === 'object') {
                for (const dateKey in data.events) {
                    const matches = data.events[dateKey];
                    if (Array.isArray(matches)) {
                        matches.forEach(match => {
                            const [team1 = 'N/A', team2 = 'N/A'] = match.match.split(' - ');
                            const dateObj = new Date(match.unix_timestamp * 1000);
                            const rawDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
                            const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' });
                            const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

                            tempMatches.push({
                                sport: match.sport,
                                team1,
                                team2,
                                league: match.tournament,
                                date: dateStr,
                                time: timeStr,
                                link: match.channels?.[0] || null,
                                unix_timestamp: match.unix_timestamp,
                                rawDate
                            });
                        });
                    }
                }

                allMatchesData = tempMatches;
                populateFilters(allMatchesData);
                applyFilters();
            } else {
                scheduleContainer.innerHTML = '<p class="text-center text-gray-600 dark:text-gray-400">No events data found in the API response.</p>';
            }
        } catch (err) {
            console.error('Fetch error:', err);
            errorMessageDiv.classList.remove('hidden');
        } finally {
            loadingSpinner.classList.add('hidden');
        }
    };

    const toggleTheme = () => {
        const isDark = document.body.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        themeIcon.textContent = isDark ? '🌙' : '☀️';
    };

    // Init
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark');
        themeIcon.textContent = '🌙';
    } else {
        themeIcon.textContent = '☀️';
    }

    themeToggle.addEventListener('click', toggleTheme);
    sportFilter.addEventListener('change', applyFilters);
    tournamentFilter.addEventListener('change', applyFilters);
    sortByDropdown.addEventListener('change', applyFilters);

    fetchAndDisplaySchedule();
    
    //EMBED
    if (channelUrl) {
        const videoResponsiveWrapper = document.createElement('div');
        videoResponsiveWrapper.classList.add('video-responsive');

        const iframe = document.createElement('iframe');
        iframe.setAttribute('allow', 'encrypted-media; fullscreen');
        iframe.setAttribute('scrolling', 'no');
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allowfullscreen', '');
        iframe.src = channelUrl;

        videoResponsiveWrapper.appendChild(iframe);
        playerContainer.appendChild(videoResponsiveWrapper);
    } else {
        const messageBox = document.createElement('div');
        messageBox.classList.add('message-box');
        messageBox.textContent = 'No channel URL provided. Please ensure the URL is in the format: embed.html?channel=[YourChannelURL]';
        playerContainer.appendChild(messageBox);
    }                
});
