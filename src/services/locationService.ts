// ==============================================================================
// SERVICE DE LOCALISATION GPS & GÉOCODAGE INVERSE (FRANCE)
// Utilise expo-location et l'API officielle française adresse.data.gouv.fr
// ==============================================================================

import * as Location from 'expo-location';

export const locationService = {
  /**
   * Récupère la position GPS actuelle et retourne l'adresse postale française
   */
  async getCurrentAddress(): Promise<string> {
    // 1. Demande de permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error("L'autorisation d'accès au GPS a été refusée.");
    }

    // 2. Obtention des coordonnées GPS précises
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const { latitude, longitude } = position.coords;

    // 3. Géocodage inverse : tentative via l'API officielle adresse.data.gouv.fr (la plus précise en France)
    try {
      const response = await fetch(
        `https://api-adresse.data.gouv.fr/reverse/?lon=${longitude}&lat=${latitude}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          const first = data.features[0].properties;
          const label = first.label || `${first.name}, ${first.postcode} ${first.city}`;
          if (label) return label;
        }
      }
    } catch {
      // Échec de l'API externe, passage à expo-location natif
    }

    // 4. Secours via expo-location reverseGeocodeAsync
    try {
      const reverse = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (reverse && reverse.length > 0) {
        const place = reverse[0];
        const streetNumber = place.streetNumber ? `${place.streetNumber} ` : '';
        const street = place.street || place.name || '';
        const postalCode = place.postalCode || '';
        const city = place.city || place.subregion || '';

        const full = `${streetNumber}${street}, ${postalCode} ${city}`.trim();
        if (full.length > 4) return full;
      }
    } catch {
      // Ignorer
    }

    // Si aucun nom trouvé, renvoyer les coordonnées GPS
    return `Coordonnées GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  },
};
