/**
 * Lightweight results map (Leaflet + OSM). Loaded on demand after search.
 */
(function (root) {
  var leafletPromise = null;
  var mapInstance = null;
  var markersLayer = null;

  function loadLeaflet() {
    if (root.L) return Promise.resolve(root.L);
    if (leafletPromise) return leafletPromise;

    leafletPromise = new Promise(function (resolve, reject) {
      if (!document.querySelector('link[data-thc-leaflet]')) {
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.setAttribute('data-thc-leaflet', '1');
        document.head.appendChild(link);
      }

      var existing = document.querySelector('script[data-thc-leaflet]');
      if (existing) {
        existing.addEventListener('load', function () {
          resolve(root.L);
        });
        existing.addEventListener('error', reject);
        return;
      }

      var script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.setAttribute('data-thc-leaflet', '1');
      script.onload = function () {
        resolve(root.L);
      };
      script.onerror = function () {
        leafletPromise = null;
        reject(new Error('Map library failed to load'));
      };
      document.body.appendChild(script);
    });

    return leafletPromise;
  }

  function hasValidCoords(p) {
    return (
      p &&
      typeof p.latitude === 'number' &&
      typeof p.longitude === 'number' &&
      !isNaN(p.latitude) &&
      !isNaN(p.longitude) &&
      p.latitude >= -90 &&
      p.latitude <= 90 &&
      p.longitude >= -180 &&
      p.longitude <= 180
    );
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function providerMarkerIcon(L) {
    return L.divIcon({
      className: 'thc-map-marker-wrap',
      html: '<span class="thc-map-marker" aria-hidden="true"></span>',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
  }

  function centerMarkerIcon(L) {
    return L.divIcon({
      className: 'thc-map-marker-wrap',
      html: '<span class="thc-map-marker thc-map-marker--center" aria-hidden="true"></span>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
  }

  function destroy() {
    if (mapInstance) {
      mapInstance.remove();
      mapInstance = null;
      markersLayer = null;
    }
  }

  /**
   * @param {HTMLElement} container
   * @param {{ center: { latitude: number, longitude: number }, providers: object[], pickName?: function }} options
   */
  function render(container, options) {
    if (!container) return Promise.resolve();

    var center = options && options.center;
    var providers = (options && options.providers) || [];
    var pickName =
      (options && options.pickName) ||
      function (p) {
        return p.businessName || p['Business Name'] || 'Provider';
      };

    var mappable = providers.filter(hasValidCoords).slice(0, 50);
    if (!mappable.length) {
      destroy();
      container.innerHTML = '';
      container.hidden = true;
      return Promise.resolve();
    }

    container.hidden = false;
    container.innerHTML =
      '<div class="find-providers-map__inner" id="find-providers-map-canvas"></div>';

    var canvas = container.querySelector('#find-providers-map-canvas');
    if (!canvas) return Promise.resolve();

    return loadLeaflet()
      .then(function (L) {
        destroy();

        mapInstance = L.map(canvas, {
          scrollWheelZoom: false,
          tap: true,
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 19,
        }).addTo(mapInstance);

        markersLayer = L.layerGroup().addTo(mapInstance);

        if (
          center &&
          typeof center.latitude === 'number' &&
          typeof center.longitude === 'number'
        ) {
          L.marker([center.latitude, center.longitude], {
            icon: centerMarkerIcon(L),
            title: 'Your search area',
          })
            .bindPopup('<strong>Your search</strong>')
            .addTo(markersLayer);
        }

        mappable.forEach(function (p) {
          var name = pickName(p);
          var href = p.slug
            ? '/providers/' + encodeURIComponent(p.slug)
            : '';
          var popup =
            '<div class="thc-map-popup">' +
            '<strong>' +
            escapeHtml(name) +
            '</strong>';
          if (p.distance != null) {
            popup += '<br><span>' + escapeHtml(String(p.distance)) + ' mi</span>';
          }
          if (href) {
            popup +=
              '<br><a href="' +
              href +
              '">View profile</a>';
          }
          popup += '</div>';

          L.marker([p.latitude, p.longitude], {
            icon: providerMarkerIcon(L),
            title: name,
          })
            .bindPopup(popup)
            .addTo(markersLayer);
        });

        var bounds = L.latLngBounds(
          mappable.map(function (p) {
            return [p.latitude, p.longitude];
          })
        );
        if (
          center &&
          typeof center.latitude === 'number' &&
          typeof center.longitude === 'number'
        ) {
          bounds.extend([center.latitude, center.longitude]);
        }
        mapInstance.fitBounds(bounds, { padding: [36, 36], maxZoom: 12 });

        setTimeout(function () {
          if (mapInstance) mapInstance.invalidateSize();
        }, 80);
      })
      .catch(function (err) {
        console.warn('Map unavailable:', err);
        container.innerHTML =
          '<p class="find-providers-map__fallback">Map preview unavailable. Results are listed below.</p>';
      });
  }

  root.ThcFindProvidersMap = {
    render: render,
    destroy: destroy,
    hasValidCoords: hasValidCoords,
  };
})(typeof window !== 'undefined' ? window : globalThis);
