// ==============================================================================
// SERVICE DE PARTAGE & ENVOI COMMERCIAL (WHATSAPP, EMAIL, EXPORT)
// ==============================================================================

import { Linking, Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import { Booking, Client, Profile } from '../types/models';

export const shareService = {
  /**
   * Ouvre WhatsApp avec un message pré-rédigé professionnel
   */
  async shareViaWhatsApp(
    booking: Booking,
    client: Client,
    profile: Profile,
    pdfUri?: string
  ): Promise<void> {
    const cleanPhone = client.phone.replace(/[^0-9+]/g, '');
    let formattedPhone = cleanPhone;

    // Normaliser au format international français (+33) si commence par 0
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+33' + formattedPhone.substring(1);
    }

    const pickupDate = new Date(booking.pickup_datetime).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const clientGreeting =
      client.type === 'entreprise'
        ? `Bonjour ${client.contact_name || client.company_name}`
        : `Bonjour ${client.first_name || client.last_name}`;

    const message = `${clientGreeting},

Votre réservation VTC est bien confirmée !

📋 Réf : ${booking.booking_number}
📅 Prise en charge : ${pickupDate}
📍 Départ : ${booking.pickup_address}
🏁 Arrivée : ${booking.dropoff_address}
💶 Tarif convenu : ${Number(booking.agreed_price).toFixed(2)} €

Votre chauffeur : ${profile.first_name} ${profile.last_name} (${profile.commercial_name || 'VTC'})
📞 Tél : ${profile.phone}
Numéro REVTC : ${profile.revtc_number}

Merci de votre confiance.`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `whatsapp://send?phone=${formattedPhone}&text=${encodedMessage}`;

    const canOpen = await Linking.canOpenURL(whatsappUrl);
    if (canOpen) {
      await Linking.openURL(whatsappUrl);
    } else {
      // Fallback web WhatsApp si l'application n'est pas installée
      const webUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
      await Linking.openURL(webUrl);
    }

    // Si un PDF est disponible, proposer également le partage natif du document
    if (pdfUri) {
      setTimeout(async () => {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(pdfUri, {
            mimeType: 'application/pdf',
            dialogTitle: `Envoyer le PDF à ${client.phone}`,
          });
        }
      }, 1000);
    }
  },

  /**
   * Envoie par e-mail
   */
  async shareViaEmail(
    booking: Booking,
    client: Client,
    profile: Profile
  ): Promise<void> {
    const toEmail = client.email || '';
    const subject = encodeURIComponent(
      `Confirmation de votre réservation VTC ${booking.booking_number}`
    );

    const pickupDate = new Date(booking.pickup_datetime).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const body = encodeURIComponent(
      `Bonjour,\n\nVeuillez trouver ci-joint les détails de votre réservation VTC :\n\n- Référence : ${booking.booking_number}\n- Date et heure de prise en charge : ${pickupDate}\n- Lieu de départ : ${booking.pickup_address}\n- Lieu d'arrivée : ${booking.dropoff_address}\n- Montant convenu : ${Number(booking.agreed_price).toFixed(2)} € (TVA non applicable, art. 293 B du CGI)\n\nChauffeur : ${profile.first_name} ${profile.last_name} (REVTC : ${profile.revtc_number})\nTéléphone : ${profile.phone}\n\nRestant à votre entière disposition.`
    );

    const mailtoUrl = `mailto:${toEmail}?subject=${subject}&body=${body}`;
    if (await Linking.canOpenURL(mailtoUrl)) {
      await Linking.openURL(mailtoUrl);
    }
  },
};
