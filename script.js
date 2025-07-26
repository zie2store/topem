document.addEventListener('DOMContentLoaded', () => {
            const scheduleContainer = document.getElementById('schedule-container');
            const errorMessageDiv = document.getElementById('error-message');
            const loadingSpinner = document.getElementById('loading-spinner');
            const sportFilter = document.getElementById('sport-filter');
            const tournamentFilter = document.getElementById('tournament-filter');
            const sortByDropdown = document.getElementById('sort-by');
            const searchInput = document.getElementById('search-input'); 
            const themeToggle = document.getElementById('theme-toggle');
            const themeIcon = document.getElementById('theme-icon');
            const secondaryNavbar = document.getElementById('secondary-navbar');
            const apiUrl = 'https://topembed.pw/api.php?format=json';

            let allMatchesData = []; // Store all fetched matches for filtering

            /**
             * Determines the status label for a match based on current time.
             * @param {object} match - The match object with unix_timestamp.
             * @returns {string|null} - The status string ('Live Now', 'Upcoming', 'Finished') or null if no label.
             */
            function getMatchStatus(match) {
                const matchStartTime = match.unix_timestamp * 1000; // Convert to milliseconds
                const currentTime = new Date().getTime();

                const thirtyMinutesBefore = matchStartTime - (30 * 60 * 1000);
                const twoAndHalfHoursAfter = matchStartTime + (2.5 * 60 * 60 * 1000);

                if (currentTime >= matchStartTime && currentTime < twoAndHalfHoursAfter) {
                    return 'Live Now';
                } else if (currentTime >= thirtyMinutesBefore && currentTime < matchStartTime) {
                    return 'Upcoming';
                } else if (currentTime >= twoAndHalfHoursAfter) {
                    return 'Finished';
                }
                return null; // No specific label applies
            }

            /**
             * Returns a numerical priority for a match status for sorting purposes.
             * @param {string|null} status - The status string ('Live Now', 'Upcoming', 'Finished') or null.
             * @returns {number} - Numerical priority (lower means higher priority).
             */
            function getStatusPriority(status) {
                switch (status) {
                    case 'Live Now': return 1;
                    case 'Upcoming': return 2;
                    case 'Finished': return 3;
                    default: return 4; // For matches with no immediate status (further in future)
                }
            }

            /**
             * Determines if a match should be dismissed (hidden) based on its scheduled time.
             * A match is dismissed if the current time is 3 hours past its scheduled start time.
             * @param {object} match - The match object containing unix_timestamp.
             * @returns {boolean} - True if the match should be dismissed, false otherwise.
             */
            function shouldDismissMatch(match) {
                const matchStartTime = new Date(match.unix_timestamp * 1000); // Convert to milliseconds
                const dismissTime = new Date(matchStartTime.getTime() + (3 * 60 * 60 * 1000)); // Add 3 hours
                const currentTime = new Date();
                return currentTime.getTime() > dismissTime.getTime();
            }

            /**
             * Renders the match cards based on the provided matches array.
             * Groups matches by date and displays them under appropriate headings if sorted by default.
             * Otherwise, renders a flat list.
             * @param {Array} matchesToDisplay - The array of matches to render.
             */
            function renderMatches(matchesToDisplay) {
                scheduleContainer.innerHTML = ''; // Clear previous content

                // Filter out dismissed matches before grouping and rendering
                const nonDismissedMatches = matchesToDisplay.filter(match => !shouldDismissMatch(match));

                if (nonDismissedMatches.length === 0) {
                    scheduleContainer.innerHTML = '<p class="text-center text-gray-600 dark:text-gray-400">No upcoming matches found for the selected filters.</p>';
                    return;
                }

                const selectedSortBy = sortByDropdown.value;

                if (selectedSortBy === 'default') {
                    // Group matches by their raw date (YYYY-MM-DD) for default sorting
                    const groupedMatches = new Map();
                    nonDismissedMatches.forEach(match => {
                        const dateKey = match.rawDate;
                        if (!groupedMatches.has(dateKey)) {
                            groupedMatches.set(dateKey, []);
                        }
                        groupedMatches.get(dateKey).push(match);
                    });

                    const today = new Date();
                    today.setHours(0, 0, 0, 0); // Normalize to start of local day
                    const tomorrow = new Date(today);
                    tomorrow.setDate(today.getDate() + 1);

                    // Sort dates to ensure chronological order
                    const sortedDates = Array.from(groupedMatches.keys()).sort();

                    sortedDates.forEach(dateKey => {
                        const matchesForDate = groupedMatches.get(dateKey);
                        const matchDate = new Date(dateKey); // This will be local midnight for dateKey
                        matchDate.setHours(0, 0, 0, 0); // Ensure it's truly normalized to local midnight for comparison

                        let dateHeadingText = '';
                        if (matchDate.getTime() === today.getTime()) {
                            dateHeadingText = 'Today';
                        } else if (matchDate.getTime() === tomorrow.getTime()) {
                            dateHeadingText = 'Tomorrow';
                        } else {
                            // Format for other dates: "Wed, July 23"
                            const options = { weekday: 'short', month: 'long', day: 'numeric' };
                            dateHeadingText = matchDate.toLocaleDateString('en-US', options);
                        }

                        const dateHeading = document.createElement('h2');
                        dateHeading.classList.add('text-xl', 'sm:text-2xl', 'font-bold', 'text-gray-800', 'dark:text-gray-200', 'mt-8', 'mb-4', 'col-span-full', 'text-center');
                        dateHeading.textContent = dateHeadingText;
                        scheduleContainer.appendChild(dateHeading);

                        // Create a sub-grid for the cards of this date
                        const dateCardsContainer = document.createElement('div');
                        dateCardsContainer.classList.add('grid', 'grid-cols-1', 'md:grid-cols-2', 'gap-6', 'col-span-full');

                        matchesForDate.forEach(match => {
                            dateCardsContainer.appendChild(createMatchCardElement(match));
                        });
                        scheduleContainer.appendChild(dateCardsContainer);
                    });
                } else {
                    // For 'status' sort, render a flat list without date headings
                    nonDismissedMatches.forEach(match => {
                        scheduleContainer.appendChild(createMatchCardElement(match));
                    });
                }
            }

            /**
             * Creates and returns a single match card DOM element.
             * @param {object} match - The match data.
             * @returns {HTMLElement} - The created div element for the match card.
             */
            function createMatchCardElement(match) {
                const matchCard = document.createElement('div');
                matchCard.classList.add('card');

                // Determine the status label
                const status = getMatchStatus(match);
                let statusLabelHtml = '';
                if (status) {
                    let labelClass = '';
                    if (status === 'Live Now') {
                        labelClass = 'live-now';
                    } else if (status === 'Upcoming') {
                        labelClass = 'upcoming';
                    } else if (status === 'Finished') {
                        labelClass = 'finished';
                    }
                    statusLabelHtml = `<span class="status-label ${labelClass}">${status}</span>`;
                }

                // Determine the displayed date/time
                const matchDateTime = new Date(match.unix_timestamp * 1000);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(today.getDate() + 1);

                let displayDate = match.date; // Default to formatted date
                if (matchDateTime.setHours(0,0,0,0) === today.getTime()) {
                    displayDate = 'Today';
                } else if (matchDateTime.setHours(0,0,0,0) === tomorrow.getTime()) {
                    displayDate = 'Tomorrow';
                }
                const combinedDateTime = `${displayDate} | ${match.time}`;


                // Construct the URL for the embed player
                const embedUrl = match.link ? `embed.html?channel=${encodeURIComponent(match.link)}` : null;

                // Conditional rendering of the "Watch Live" button and alternative text
               let watchLiveButtonHtml = [];

                        let embedUrls = [];
                        
                        // Debug: See what format you're dealing with
                        console.log('Raw match.channels:', match.channels);
                        
                        // Fix: Convert stringified array if needed
                        if (typeof match.channels === 'string') {
                            try {
                                embedUrls = JSON.parse(match.channels);
                                console.log('Parsed channels:', embedUrls);
                            } catch (err) {
                                console.error('Invalid JSON in match.channels:', match.channels);
                            }
                        } else if (Array.isArray(match.channels)) {
                            embedUrls = match.channels;
                        }
                        
                        if (embedUrls.length > 0) {
                            const channelButtons = embedUrls.slice(0, 3).map((url, index) => {
                                return `<a href="${url}" target="_blank" class="live-link">Live ${index + 1}</a>`;
                            });
                            watchLiveButtonHtml = channelButtons.join(' ');
                        } else {
                            watchLiveButtonHtml = '<p class="text-gray-500 text-sm dark:text-gray-400">Live available 30\' prior to the game.</p>';
                        }

                // Determine how to display the teams/match name
                let matchTeamsDisplay = '';
                if (match.match.includes(' - ')) {
                    const teams = match.match.split(' - ');
                    const team1 = teams[0].trim() || 'N/A';
                    const team2 = teams[1].trim() || 'N/A';
                    matchTeamsDisplay = `${team1} <span class="text-gray-500 dark:text-gray-400">vs</span> ${team2}`;
                } else {
                    matchTeamsDisplay = match.match; // Display the full match string if no ' - '
                }


                matchCard.innerHTML = `
            ${statusLabelHtml}
            <div class="flex flex-col flex-grow">
                <div class="flex flex-col sm:flex-row items-center justify-between mb-4">
                    <div class="text-center sm:text-left mb-2 sm:mb-0">
                        <p class="text-lg team-name">${matchTeamsDisplay}</p>
                        <p class="match-info text-gray-600 dark:text-gray-400">${match.league}</p>
                        <p class="match-info text-gray-500 dark:text-gray-400">${combinedDateTime}</p>
                    </div>
                    <div></div>
                </div>
                <div class="text-center sm:text-right mt-auto flex flex-wrap justify-end gap-2">
                    ${watchLiveButtonHtml}
                </div>
            </div>
        `;
        return matchCard;
            }


            /**
             * Applies filters and re-renders the matches.
             */
            function applyFilters() {
                const selectedSport = sportFilter.value;
                const selectedTournament = tournamentFilter.value;
                const selectedSortBy = sortByDropdown.value;
                const searchTerm = searchInput.value.toLowerCase(); // Get search term

                let filteredMatches = allMatchesData.filter(match => {
                    const sportMatch = selectedSport === 'all' || match.sport === selectedSport;
                    const tournamentMatch = selectedTournament === 'all' || match.league === selectedTournament;

                    // Search logic
                    const matchText = `${match.team1} ${match.team2} ${match.league} ${match.sport} ${match.date} ${match.time} ${match.match}`.toLowerCase(); // Include original match string in search
                    const searchMatch = matchText.includes(searchTerm);

                    return sportMatch && tournamentMatch && searchMatch;
                });

                // Apply sorting based on the selected option
                if (selectedSortBy === 'status') {
                    filteredMatches.sort((a, b) => {
                        const priorityA = getStatusPriority(getMatchStatus(a));
                        const priorityB = getStatusPriority(getMatchStatus(b));
                        if (priorityA !== priorityB) {
                            return priorityA - priorityB;
                        }
                        return a.unix_timestamp - b.unix_timestamp; // Secondary sort by time
                    });
                } else { // 'default' - sort by unix_timestamp
                    filteredMatches.sort((a, b) => a.unix_timestamp - b.unix_timestamp);
                }

                renderMatches(filteredMatches);
            }

            /**
             * Populates the filter dropdowns with unique sports and tournaments.
             * @param {Array} matches - The array of all fetched matches.
             */
            function populateFilters(matches) {
                const uniqueSports = new Set();
                const uniqueTournaments = new Set();

                matches.forEach(match => {
                    uniqueSports.add(match.sport);
                    uniqueTournaments.add(match.league);
                });

                // Clear existing options (except "All")
                sportFilter.innerHTML = '<option value="all">All Sports</option>';
                tournamentFilter.innerHTML = '<option value="all">All Tournaments</option>';

                // Add unique sports
                Array.from(uniqueSports).sort().forEach(sport => {
                    const option = document.createElement('option');
                    option.value = sport;
                    option.textContent = sport;
                    sportFilter.appendChild(option);
                });

                // Add unique tournaments
                Array.from(uniqueTournaments).sort().forEach(tournament => {
                    const option = document.createElement('option');
                    option.value = tournament;
                    option.textContent = tournament;
                    tournamentFilter.appendChild(option);
                });
            }

            /**
             * Fetches sports schedule data from the API and displays it.
             */
            async function fetchAndDisplaySchedule() {
                loadingSpinner.classList.remove('hidden'); // Show loading spinner
                errorMessageDiv.classList.add('hidden'); // Hide any previous error messages
                scheduleContainer.innerHTML = ''; // Clear previous content

                try {
                    const response = await fetch(apiUrl);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const apiData = await response.json();

                    if (apiData && apiData.events && typeof apiData.events === 'object') {
                        const tempAllMatches = [];

                        for (const dateKey in apiData.events) {
                            if (Object.hasOwnProperty.call(apiData.events, dateKey)) {
                                const dailyMatches = apiData.events[dateKey];

                                if (Array.isArray(dailyMatches)) {
                                    dailyMatches.forEach(match => {
                                        // Store the original match string for display and search
                                        const originalMatchString = match.match;

                                        const teams = originalMatchString.split(' - ');
                                        const team1 = teams[0].trim() || 'N/A';
                                        const team2 = teams[1] ? teams[1].trim() : 'N/A'; // Only set team2 if it exists

                                        const matchDateTime = new Date(match.unix_timestamp * 1000);
                                        // Explicitly get local year, month, day for rawDate
                                        const year = matchDateTime.getFullYear();
                                        const month = String(matchDateTime.getMonth() + 1).padStart(2, '0');
                                        const day = String(matchDateTime.getDate()).padStart(2, '0');
                                        const rawDate = `${year}-${month}-${day}`;

                                        // Updated date options for shorter format
                                        const dateOptions = { weekday: 'short', month: 'long', day: 'numeric' };
                                        const timeOptions = { hour: '2-digit', minute: '2-digit' };
                                        const formattedDate = matchDateTime.toLocaleDateString('en-US', dateOptions);
                                        const formattedTime = matchDateTime.toLocaleTimeString('en-US', timeOptions);

                                        tempAllMatches.push({
                                            sport: match.sport, // Added sport for filtering
                                            match: originalMatchString, // Store original match string
                                            team1: team1, // Keep for search/filter consistency
                                            team2: team2, // Keep for search/filter consistency
                                            league: match.tournament,
                                            date: formattedDate,
                                            time: formattedTime,
                                            link: match.channels && match.channels.length > 0 ? match.channels[0] : null,
                                            unix_timestamp: match.unix_timestamp, // Keep original timestamp
                                            rawDate: rawDate // Use the locally derived YYYY-MM-DD
                                        });
                                    });
                                }
                            }
                        }
                        allMatchesData = tempAllMatches; // Store the fetched data

                        populateFilters(allMatchesData); // Populate filters after data is fetched
                        applyFilters(); // Display all matches initially
                    } else {
                        scheduleContainer.innerHTML = '<p class="text-center text-gray-600 dark:text-gray-400">No events data found in the API response.</p>';
                    }
                } catch (error) {
                    console.error('Error fetching data:', error);
                    errorMessageDiv.classList.remove('hidden');
                    scheduleContainer.innerHTML = '';
                } finally {
                    loadingSpinner.classList.add('hidden');
                }
            }

            // Theme toggle functionality
            function toggleTheme() {
                document.body.classList.toggle('dark');
                const isDarkMode = document.body.classList.contains('dark');
                localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
                themeIcon.textContent = isDarkMode ? '🌙' : '☀️'; // Update icon
            }

            // Apply saved theme on load
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'dark') {
                document.body.classList.add('dark');
                themeIcon.textContent = '🌙';
            } else {
                themeIcon.textContent = '☀️';
            }

            themeToggle.addEventListener('click', toggleTheme);
            
            // Event listener for secondary navbar links
            secondaryNavbar.addEventListener('click', (event) => {
                if (event.target.tagName === 'A') {
                    event.preventDefault(); // Prevent default link behavior
                    const sportFilterValue = event.target.dataset.sportFilter;

                    // Update the main sport filter dropdown
                    sportFilter.value = sportFilterValue;

                    // Remove active class from all secondary navbar links
                    secondaryNavbar.querySelectorAll('a').forEach(link => {
                        link.classList.remove('active');
                    });
                    // Add active class to the clicked link
                    event.target.classList.add('active');

                    applyFilters(); // Re-apply filters
                }
            });

            // Event listeners for main filter/sort/search controls
            sportFilter.addEventListener('change', () => {
                // When main sport filter changes, update secondary navbar active state
                secondaryNavbar.querySelectorAll('a').forEach(link => {
                    if (link.dataset.sportFilter === sportFilter.value) {
                        link.classList.add('active');
                    } else {
                        link.classList.remove('active');
                    }
                });
                applyFilters();
            });
            tournamentFilter.addEventListener('change', applyFilters);
            sortByDropdown.addEventListener('change', applyFilters);
            searchInput.addEventListener('input', applyFilters); // Listen for input on search field

            // Initial fetch when the page loads
            fetchAndDisplaySchedule();
        });

//EMBED FUNCTIONS START HERE
document.addEventListener('DOMContentLoaded', () => {
            const playerContainer = document.getElementById('player-container');
            const urlParams = new URLSearchParams(window.location.search);
            const channelUrl = urlParams.get('channel'); // Get the 'channel' query parameter

            if (channelUrl) {
                const decodedChannelUrl = decodeURIComponent(channelUrl);
                const channelParts = decodedChannelUrl.split('/');
                const rawChannelName = channelParts[channelParts.length - 1]; // e.g., "SkySportsNews[UK]"
                const cleanChannelName = rawChannelName.replace(/\[|\]/g, ''); // e.g., "SkySportsNewsUK"
                    document.title = `Watch ${cleanChannelName} Live Stream in HD Resoultion`;
                        
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
                // Display a message if no channel URL is provided
                const messageBox = document.createElement('div');
                messageBox.classList.add('message-box');
                messageBox.textContent = 'No channel URL provided. Please ensure the URL is in the format: embed.html?channel=[YourChannelURL]';
                playerContainer.appendChild(messageBox);
            }
    });
//LIVE TV FUNCTIONS START HERE
const cardContainer = document.getElementById('cardContainer');
        const searchInput = document.getElementById('searchInput');
        const countryFilter = document.getElementById('countryFilter');
        const sortBy = document.getElementById('sortBy');
        const secondaryNavbar = document.getElementById('secondary-navbar');
        let data = [];
            const baseURL = window.location.origin;

        function createCard(channel) {
            const link = `${baseURL}/embed.html?channel=${encodeURIComponent(channel.URL)}`;

            return `
                <div class="card">
                    <a href="${link}" target="_blank">
                        <div class="channel-name">${channel.ChannelName}</div>
                        <div class="country">${channel.Country}</div>
                    </a>
                </div>
            `;
        }

        function renderCards() {
            const query = searchInput.value.toLowerCase();
            const country = countryFilter.value;
            const sortKey = sortBy.value;

            let filtered = data.filter(ch =>
                ch.ChannelName.toLowerCase().includes(query) &&
                (country === '' || ch.Country === country)
            );

            if (sortKey) {
                filtered = filtered.sort((a, b) => a[sortKey].localeCompare(b[sortKey]));
            }

            cardContainer.innerHTML = filtered.map(createCard).join('');
        }

        function populateFilter() {
            const countries = [...new Set(data.map(ch => ch.Country))].sort();
            countries.forEach(c => {
                const option = document.createElement('option');
                option.value = c;
                option.textContent = c;
                countryFilter.appendChild(option);
            });
        }

        Papa.parse('channels.csv', {
            download: true,
            header: true,
            complete: function(results) {
                data = results.data.filter(row => row.ChannelName && row.URL);
                populateFilter();
                renderCards();
            }
        });

        searchInput.addEventListener('input', renderCards);
        countryFilter.addEventListener('change', renderCards);
        sortBy.addEventListener('change', renderCards);

        // Event listener for secondary navbar links
            secondaryNavbar.addEventListener('click', (event) => {
                if (event.target.tagName === 'A') {
                    event.preventDefault(); // Prevent default link behavior
                    const countryFilterValue = event.target.dataset.countryFilter;

                    // Update the main country filter dropdown
                    countryFilter.value = countryFilterValue;

                    // Remove active class from all secondary navbar links
                    secondaryNavbar.querySelectorAll('a').forEach(link => {
                        link.classList.remove('active');
                    });
                    // Add active class to the clicked link
                    event.target.classList.add('active');

                    // Trigger renderCards (assuming it's available globally or via initLivePage)
                    if (typeof renderCards === 'function') {
                        renderCards();
                    }
                }
            });

            // When main country filter changes, update secondary navbar active state
            countryFilter.addEventListener('change', () => {
                secondaryNavbar.querySelectorAll('a').forEach(link => {
                    if (link.dataset.countryFilter === countryFilter.value) {
                        link.classList.add('active');
                    } else {
                        link.classList.remove('active');
                    }
                });
            });
