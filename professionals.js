// ============================================================
// NEUROSARATHI V2 — professionals.js
// Professionals & Google Maps Module
// ============================================================

// ─── STATE ─────────────────────────────────────────────────────

const professionalsState = {
    map: null,
    markers: [],
    infoWindows: [],
    professionals: [],
    filteredProfessionals: [],
    currentFilter: 'all',
    searchQuery: '',
    userLocation: null,
    isLoading: false
};

// ─── GOOGLE MAPS INITIALIZATION ─────────────────────────────

let googleMapsLoaded = false;

/**
 * Load Google Maps API
 */
function loadGoogleMaps(apiKey) {
    if (googleMapsLoaded) return;
    if (!apiKey) {
        console.warn('Google Maps API key not provided — map features disabled.');
        return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
        googleMapsLoaded = true;
        console.log('✅ Google Maps loaded');
    };
    document.head.appendChild(script);
}

/**
 * Initialize Google Map
 */
function initMap(elementId, options = {}) {
    if (!googleMapsLoaded || typeof google === 'undefined') {
        console.warn('Google Maps not loaded yet');
        return null;
    }

    const defaultOptions = {
        center: { lat: 28.6139, lng: 77.2090 }, // Default: Delhi
        zoom: 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        styles: [
            {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
            }
        ]
    };

    const map = new google.maps.Map(
        document.getElementById(elementId),
        { ...defaultOptions, ...options }
    );

    professionalsState.map = map;

    // Try to get user location
    getUserLocation();

    return map;
}

/**
 * Get user location
 */
function getUserLocation() {
    if (!navigator.geolocation) {
        loadAllProfessionals();
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            professionalsState.userLocation = { lat: latitude, lng: longitude };

            if (professionalsState.map) {
                professionalsState.map.setCenter({ lat: latitude, lng: longitude });
                professionalsState.map.setZoom(13);
            }

            // Load nearby professionals
            loadNearbyProfessionals(latitude, longitude);
        },
        (error) => {
            console.warn('Geolocation error:', error.message);
            loadAllProfessionals();
        }
    );
}

// ─── LOAD PROFESSIONALS ──────────────────────────────────────

/**
 * Load all professionals
 */
async function loadAllProfessionals() {
    try {
        professionalsState.isLoading = true;
        showSkeleton('professionalsContainer', 3, 'card');

        const professionals = await getProfessionals();
        professionalsState.professionals = professionals;
        professionalsState.filteredProfessionals = professionals;

        renderProfessionals(professionals);
        addMarkers(professionals);

        hideSkeleton('professionalsContainer');

    } catch (error) {
        console.error('Error loading professionals:', error);
        showToast('Failed to load professionals', 'error');
        hideSkeleton('professionalsContainer');
    } finally {
        professionalsState.isLoading = false;
    }
}

/**
 * Load nearby professionals
 * (requires a `find_professionals_nearby` Postgres function/RPC in Supabase;
 *  falls back to loadAllProfessionals if the RPC is missing or errors)
 */
async function loadNearbyProfessionals(lat, lng) {
    try {
        professionalsState.isLoading = true;
        showSkeleton('professionalsContainer', 3, 'card');

        // Get professionals within radius
        const radius = 10; // km
        const { data: professionals, error } = await supabase
            .rpc('find_professionals_nearby', {
                lat_input: lat,
                lng_input: lng,
                radius_km: radius
            });

        if (error) throw error;

        professionalsState.professionals = professionals || [];
        professionalsState.filteredProfessionals = professionals || [];

        renderProfessionals(professionals || []);
        addMarkers(professionals || []);

        hideSkeleton('professionalsContainer');

    } catch (error) {
        console.error('Error loading nearby professionals (falling back to full list):', error);
        await loadAllProfessionals();
    } finally {
        professionalsState.isLoading = false;
    }
}

/**
 * Filter professionals
 */
function filterProfessionals(filter) {
    professionalsState.currentFilter = filter;
    applyFilters();
}

/**
 * Search professionals
 */
function searchProfessionals(query) {
    professionalsState.searchQuery = query.toLowerCase();
    applyFilters();
}

/**
 * Apply all filters
 */
function applyFilters() {
    let filtered = professionalsState.professionals;

    // Apply category filter
    if (professionalsState.currentFilter !== 'all') {
        filtered = filtered.filter(p =>
            p.specialization?.includes(professionalsState.currentFilter)
        );
    }

    // Apply search query
    if (professionalsState.searchQuery) {
        filtered = filtered.filter(p =>
            p.name?.toLowerCase().includes(professionalsState.searchQuery) ||
            p.title?.toLowerCase().includes(professionalsState.searchQuery) ||
            p.city?.toLowerCase().includes(professionalsState.searchQuery)
        );
    }

    professionalsState.filteredProfessionals = filtered;
    renderProfessionals(filtered);
    updateMarkers(filtered);
}

// ─── RENDER PROFESSIONALS ────────────────────────────────────

/**
 * Render professionals list
 */
function renderProfessionals(professionals) {
    const container = document.getElementById('professionalsContainer');
    if (!container) return;

    if (professionals.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">🔍</span>
                <div class="empty-state-title">No professionals found</div>
                <div class="empty-state-description">Try adjusting your search or filters</div>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    professionals.forEach(prof => {
        const card = createProfessionalCard(prof);
        container.appendChild(card);
    });
}

/**
 * Create professional card
 */
function createProfessionalCard(professional) {
    const card = document.createElement('div');
    card.className = 'professional-card card-soft fade-in';

    const distance = professional.distance ?
        `<span>📍 ${professional.distance.toFixed(1)} km</span>` : '';

    card.innerHTML = `
        <div class="professional-card-header">
            <div class="professional-avatar avatar avatar-lg">
                ${professional.photo_url ?
                    `<img src="${professional.photo_url}" alt="${professional.name}" class="avatar-img" />` :
                    `<span>${getInitials(professional.name)}</span>`
                }
            </div>
            <div class="professional-info">
                <h3 class="professional-name">${professional.name}</h3>
                <p class="professional-title">${professional.title || 'Professional'}</p>
                <div class="professional-meta">
                    <span>⭐ ${professional.rating || 0} (${professional.review_count || 0} reviews)</span>
                    ${distance}
                    ${professional.verified ? '<span class="badge badge-green">✅ Verified</span>' : ''}
                </div>
            </div>
        </div>
        <div class="professional-details">
            ${professional.specialization?.length ?
                `<div class="professional-tags">
                    ${professional.specialization.map(s =>
                        `<span class="badge badge-blue">${s}</span>`
                    ).join('')}
                </div>` : ''
            }
            ${professional.address ?
                `<p class="professional-address">📍 ${professional.address}</p>` : ''
            }
            ${professional.experience_years ?
                `<p class="professional-experience">💼 ${professional.experience_years} years experience</p>` : ''
            }
        </div>
        <div class="professional-actions">
            ${professional.phone ?
                `<a href="tel:${professional.phone}" class="btn btn-secondary btn-sm">
                    <i class="fas fa-phone"></i> Call
                </a>` : ''
            }
            ${professional.phone ?
                `<a href="https://wa.me/${professional.phone.replace(/[^0-9]/g, '')}"
                   class="btn btn-secondary btn-sm" target="_blank" rel="noopener noreferrer">
                    <i class="fab fa-whatsapp" style="color:#25D366;"></i> WhatsApp
                </a>` : ''
            }
            ${professional.website ?
                `<a href="${professional.website}" class="btn btn-secondary btn-sm" target="_blank" rel="noopener noreferrer">
                    <i class="fas fa-globe"></i> Website
                </a>` : ''
            }
            <button class="btn btn-primary btn-sm" onclick="makeEnquiry('${professional.id}')">
                <i class="fas fa-envelope"></i> Enquire
            </button>
            <button class="btn btn-ghost btn-icon" onclick="saveProfessional('${professional.id}')" title="Save to favourites">
                <i class="fas fa-star"></i>
            </button>
        </div>
    `;

    return card;
}

// ─── GOOGLE MAPS MARKERS ────────────────────────────────────

/**
 * Add markers to map
 */
function addMarkers(professionals) {
    if (!professionalsState.map || typeof google === 'undefined') return;

    clearMarkers();

    professionals.forEach(prof => {
        if (!prof.latitude || !prof.longitude) return;

        const marker = new google.maps.Marker({
            position: { lat: prof.latitude, lng: prof.longitude },
            map: professionalsState.map,
            title: prof.name,
            animation: google.maps.Animation.DROP
        });

        const infoWindow = new google.maps.InfoWindow({
            content: `
                <div style="padding:8px;">
                    <strong>${prof.name}</strong>
                    <p style="margin:4px 0;font-size:12px;color:#666;">${prof.title || ''}</p>
                    <p style="margin:4px 0;font-size:12px;">⭐ ${prof.rating || 0}</p>
                </div>
            `
        });

        marker.addListener('click', () => {
            infoWindow.open(professionalsState.map, marker);
        });

        professionalsState.markers.push(marker);
        professionalsState.infoWindows.push(infoWindow);
    });
}

/**
 * Update markers based on filters
 */
function updateMarkers(professionals) {
    clearMarkers();
    addMarkers(professionals);
}

/**
 * Clear all markers
 */
function clearMarkers() {
    professionalsState.markers.forEach(marker => marker.setMap(null));
    professionalsState.markers = [];
    professionalsState.infoWindows.forEach(info => info.close());
    professionalsState.infoWindows = [];
}

// ─── ENQUIRY FUNCTIONS ──────────────────────────────────────

/**
 * Make enquiry to professional
 */
async function makeEnquiry(professionalId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            showToast('Please login to make enquiry', 'warning');
            return;
        }

        // Show enquiry modal
        createModal({
            id: 'enquiryModal',
            header: '📝 Send Enquiry',
            body: `
                <form id="enquiryForm">
                    <div class="form-group">
                        <label class="form-label">Your Message *</label>
                        <textarea class="form-control" id="enquiryMessage"
                                  rows="4" placeholder="Write your message here..."
                                  required></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Your Contact Number</label>
                        <input type="tel" class="form-control" id="enquiryPhone"
                               placeholder="Enter your phone number" />
                    </div>
                </form>
            `,
            footer: `
                <button class="btn btn-secondary" onclick="hideModal('enquiryModal')">Cancel</button>
                <button class="btn btn-primary" onclick="submitEnquiry('${professionalId}')">
                    <i class="fas fa-paper-plane"></i> Send
                </button>
            `
        });

        showModal('enquiryModal');

    } catch (error) {
        console.error('Error making enquiry:', error);
        showToast('Failed to open enquiry form', 'error');
    }
}

/**
 * Submit enquiry
 */
async function submitEnquiry(professionalId) {
    const message = document.getElementById('enquiryMessage')?.value.trim();
    const phone = document.getElementById('enquiryPhone')?.value.trim();

    if (!message) {
        showToast('Please enter a message', 'error');
        return;
    }

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        await createEnquiry({
            professional_id: professionalId,
            parent_id: user.id,
            message: message,
            phone: phone || null,
            status: 'pending'
        });

        hideModal('enquiryModal');
        document.getElementById('enquiryModal')?.remove();
        showToast('Enquiry sent successfully! 📨', 'success');

    } catch (error) {
        console.error('Error submitting enquiry:', error);
        showToast('Failed to send enquiry', 'error');
    }
}

/**
 * Save professional to favourites
 * (FIX: original used .single() which throws when 0 rows match —
 *  changed to .maybeSingle() so "not yet saved" is a normal null result,
 *  not a thrown error.)
 */
async function saveProfessional(professionalId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            showToast('Please login to save', 'warning');
            return;
        }

        // Check if already saved
        const { data: existing } = await supabase
            .from('saved_professionals')
            .select('*')
            .eq('user_id', user.id)
            .eq('professional_id', professionalId)
            .maybeSingle();

        if (existing) {
            // Remove
            await supabase
                .from('saved_professionals')
                .delete()
                .eq('id', existing.id);

            showToast('Removed from favourites', 'info');
        } else {
            // Add
            await supabase
                .from('saved_professionals')
                .insert({
                    user_id: user.id,
                    professional_id: professionalId
                });

            showToast('Saved to favourites! ⭐', 'success');
        }

    } catch (error) {
        console.error('Error saving professional:', error);
        showToast('Failed to save', 'error');
    }
}

// ─── EXPOSE GLOBAL FUNCTIONS ────────────────────────────────

window.loadAllProfessionals = loadAllProfessionals;
window.loadNearbyProfessionals = loadNearbyProfessionals;
window.filterProfessionals = filterProfessionals;
window.searchProfessionals = searchProfessionals;
window.makeEnquiry = makeEnquiry;
window.submitEnquiry = submitEnquiry;
window.saveProfessional = saveProfessional;
window.initMap = initMap;
window.loadGoogleMaps = loadGoogleMaps;

console.log('🧠 NeuroSarathi V2 — Professionals Module Loaded');
